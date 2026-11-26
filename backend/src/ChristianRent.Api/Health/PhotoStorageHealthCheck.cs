using ChristianRent.Application.Abstractions;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ChristianRent.Api.Health;

/// <summary>Whether the photo storage can be reached and written (L2-034, criterion 1).</summary>
internal sealed class PhotoStorageHealthCheck(IPhotoStorage storage) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default) =>
        await storage.IsReachableAsync(cancellationToken)
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy();
}
