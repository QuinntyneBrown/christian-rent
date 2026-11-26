using System.Net;
using System.Net.Http.Json;
using ChristianRent.Api.Tests.Support;

namespace ChristianRent.Api.Tests;

/// <summary>L2-034 criterion 1: the backend reports whether it is alive and can reach its stores.</summary>
public sealed class HealthTests : IClassFixture<ApiFactory>
{
    private readonly ApiFactory _factory;

    public HealthTests(ApiFactory factory)
    {
        _factory = factory;
        _factory.PhotoStorage.Reachable = true;
    }

    [Fact]
    [Trait("Category", "Critical")]
    public async Task Live_answers_200_while_the_process_runs()
    {
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync("/health/live", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("Healthy", await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
    }

    [Fact]
    public async Task Ready_reports_the_database_and_the_file_storage()
    {
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync("/health/ready", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<HealthReportBody>(TestContext.Current.CancellationToken);
        Assert.NotNull(report);
        Assert.Equal("Healthy", report.Status);
        Assert.Equal("Healthy", report.Checks["database"]);
        Assert.Equal("Healthy", report.Checks["photo-storage"]);
    }

    [Fact]
    public async Task Ready_answers_503_when_the_file_storage_cannot_be_reached()
    {
        _factory.PhotoStorage.Reachable = false;
        using var client = _factory.CreateHttpsClient();

        using var response = await client.GetAsync("/health/ready", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        var report = await response.Content.ReadFromJsonAsync<HealthReportBody>(TestContext.Current.CancellationToken);
        Assert.NotNull(report);
        Assert.Equal("Unhealthy", report.Status);
        Assert.Equal("Healthy", report.Checks["database"]);
        Assert.Equal("Unhealthy", report.Checks["photo-storage"]);
    }

    private sealed record HealthReportBody(string Status, Dictionary<string, string> Checks);
}
