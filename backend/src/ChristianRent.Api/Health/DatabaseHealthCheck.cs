using ChristianRent.Application.Abstractions;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace ChristianRent.Api.Health;

/// <summary>Whether the database answers (L2-034, criterion 1).</summary>
internal sealed class DatabaseHealthCheck(IAppDbContext database) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(HealthCheckContext context, CancellationToken cancellationToken = default) =>
        await database.CanConnectAsync(cancellationToken)
            ? HealthCheckResult.Healthy()
            : HealthCheckResult.Unhealthy();
}
