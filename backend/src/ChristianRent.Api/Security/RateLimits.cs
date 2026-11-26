using System.Globalization;
using System.Threading.RateLimiting;
using ChristianRent.Api.Errors;
using ChristianRent.Infrastructure.Identity;
using Microsoft.AspNetCore.RateLimiting;

namespace ChristianRent.Api.Security;

/// <summary>
/// One global limiter, partitioned by client and by kind (L2-027, criterion 3; ADR 0009): 120
/// reads (GET, HEAD) and 30 writes (every other method) a minute. The client is the signed-in
/// member, or the remote address of an anonymous caller.
/// </summary>
internal static class RateLimits
{
    public const int ReadsPerMinute = 120;
    public const int WritesPerMinute = 30;
    private static readonly TimeSpan Window = TimeSpan.FromMinutes(1);

    public static IServiceCollection AddRateLimits(this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
        {
            options.GlobalLimiter = PartitionedRateLimiter.Create<HttpContext, string>(context =>
            {
                var reads = HttpMethods.IsGet(context.Request.Method) || HttpMethods.IsHead(context.Request.Method);
                var key = $"{Client(context)}|{(reads ? "read" : "write")}";
                var clock = context.RequestServices.GetRequiredService<TimeProvider>();
                return RateLimitPartition.Get(key, _ =>
                    new TimeProviderFixedWindowLimiter(reads ? ReadsPerMinute : WritesPerMinute, Window, clock));
            });
            options.OnRejected = RejectAsync;
        });
        return services;
    }

    private static string Client(HttpContext context)
    {
        var member = context.User.FindFirst(HttpCurrentMember.MemberIdClaim)?.Value;
        return member is not null
            ? $"member:{member}"
            : $"address:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";
    }

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
