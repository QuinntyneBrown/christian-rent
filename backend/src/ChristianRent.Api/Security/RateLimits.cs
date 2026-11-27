using System.Globalization;
using System.Threading.RateLimiting;
using ChristianRent.Api.Errors;
using ChristianRent.Infrastructure.Identity;
using Microsoft.AspNetCore.RateLimiting;

namespace ChristianRent.Api.Security;

/// <summary>
/// One global limiter, partitioned by client and by kind (L2-027, criterion 3; ADR 0009): 120
/// reads (GET, HEAD) and 30 writes (every other method) a minute. The client is the signed-in
/// member, of the request's own session, or the remote address of an anonymous caller. It is
/// chained with a limiter of sign-in alone: 10 attempts per remote address per 15 minutes
/// (L2-037, criterion 4; ADR 0029).
/// </summary>
internal static class RateLimits
{
    public const int ReadsPerMinute = 120;
    public const int WritesPerMinute = 30;
    public const int SignInsPerWindow = 10;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);
    private static readonly TimeSpan SignInWindow = TimeSpan.FromMinutes(15);

    public static IServiceCollection AddRateLimits(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            var perMinute = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                var reads = HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method);
                var key = $"{Client(context)}|{(reads ? "read" : "write")}";
                var clock = context.RequestServices.GetRequiredService<TimeProvider>();
                return RateLimitPartition.Get(key, _ =>
                    new TimeProviderFixedWindowLimiter(reads ? ReadsPerMinute : WritesPerMinute, Window, clock));
            });
            var signIns = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                if (!IsSignIn(context.Request))
                {
                    return RateLimitPartition.GetNoLimiter("not-sign-in");
                }

                var clock = context.RequestServices.GetRequiredService<TimeProvider>();
                return RateLimitPartition.Get($"sign-in|{Address(context)}", _ =>
                    new TimeProviderFixedWindowLimiter(SignInsPerWindow, SignInWindow, clock));
            });
            options.GlobalLimiter = PartitionedRateLimiter.CreateChained(perMinute, signIns);
            options.OnRejected = RejectAsync;
        });
        return services;
    }

    private static string Client(HttpContext context)
    {
        var member = context.User.FindFirst(HttpCurrentMember.MemberIdClaim)?.Value;
        return member is not null ? $"member:{member}" : $"address:{Address(context)}";
    }

    private static string Address(HttpContext context) => context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

    private static bool IsSignIn(HttpRequest request) =>
        HttpMethods.IsPost(request.Method)
        && (request.Path.Equals("/api/session", StringComparison.OrdinalIgnoreCase)
            || request.Path.Equals("/api/admin/session", StringComparison.OrdinalIgnoreCase));

    private static async ValueTask RejectAsync(OnRejectedContext rejected, CancellationToken cancellationToken)
    {
        var context = rejected.HttpContext;
        if (rejected.Lease.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter))
        {
            context.Response.Headers.RetryAfter = Math.Ceiling(retryAfter.TotalSeconds).ToString(CultureInfo.InvariantCulture);
        }

        await Problems.WriteAsync(context, Problems.Create(StatusCodes.Status429TooManyRequests, "rate_limited", "Too many requests"));
    }
}
