using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ChristianRent.Api.Health;

/// <summary>
/// <c>/health/live</c> and <c>/health/ready</c> (fail-clearly-and-operate design). Both are
/// anonymous and outside the rate limiter (ADR 0009), and answer with status words only.
/// </summary>
internal static class HealthEndpoints
{
    public const string ReadyTag = "ready";

    public static IServiceCollection AddHealthEndpoints(this IServiceCollection services)
    {
        services.AddHealthChecks()
            .AddCheck<DatabaseHealthCheck>("database", tags: [ReadyTag])
            .AddCheck<PhotoStorageHealthCheck>("photo-storage", tags: [ReadyTag]);
        return services;
    }

    public static IEndpointRouteBuilder MapHealthEndpoints(this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapHealthChecks("/health/live", new HealthCheckOptions { Predicate = _ => false })
            .AllowAnonymous()
            .DisableRateLimiting();
        endpoints.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = check => check.Tags.Contains(ReadyTag),
            ResponseWriter = WriteStatusWordsAsync,
        })
            .AllowAnonymous()
            .DisableRateLimiting();
        return endpoints;
    }

    private static Task WriteStatusWordsAsync(HttpContext context, HealthReport report)
    {
        context.Response.ContentType = "application/json";
        var body = new
        {
            status = report.Status.ToString(),
            checks = report.Entries.ToDictionary(entry => entry.Key, entry => entry.Value.Status.ToString()),
        };
        return JsonSerializer.SerializeAsync(context.Response.Body, body, cancellationToken: context.RequestAborted);
    }
}
