using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using ChristianRent.Api.Tests.Support;
using Microsoft.Extensions.DependencyInjection;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;

namespace ChristianRent.Api.Tests;

/// <summary>
/// L2-034 criterion 2: every request emits a trace, its duration and its outcome. L2-028
/// criterion 3: no log, metric or trace holds a contact detail, token, message text, query string
/// or body, and a route is recorded as its template. Span listeners are process-wide, so these
/// tests run apart from the others.
/// </summary>
[Collection(TelemetryTestGroup.Name)]
public sealed class TelemetryTests : IDisposable
{
    private const string ContactDetail = "sarah.k@gmail.com";
    private const string Token = "eyJhbGciOiJIUzI1NiJ9.secret-token";
    private const string MessageText = "Is the hall free on the 14th? Call me on 604-555-0199";
    private const string PathValue = "bug-7f3a";

    private readonly TelemetryApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    [Fact]
    [Trait("Category", "Critical")]
    public async Task A_request_emits_a_server_span_with_its_route_template_method_outcome_and_duration()
    {
        using var client = _factory.CreateMemberClient(Guid.NewGuid());

        using var response = await client.GetAsync("/api/test-probe/protected", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var span = await _factory.Recorder.WaitForServerSpanAsync("api/test-probe/protected");
        Assert.Equal("GET", span.GetTagItem("http.request.method"));
        Assert.Equal(200, span.GetTagItem("http.response.status_code"));
        Assert.True(span.Duration > TimeSpan.Zero);
    }

    [Fact]
    public async Task A_request_feeds_the_request_duration_histogram_by_route_template()
    {
        using var client = _factory.CreateMemberClient(Guid.NewGuid());
        using var response = await client.GetAsync("/api/test-probe/protected", TestContext.Current.CancellationToken);

        _factory.FlushMetrics();

        var metric = Assert.Single(_factory.Metrics, metric => metric.Name == "http.server.request.duration");
        var routes = new List<object?>();
        foreach (var point in metric.GetMetricPoints())
        {
            foreach (var tag in point.Tags)
            {
                if (tag.Key == "http.route")
                {
                    routes.Add(tag.Value);
                }
            }
        }

        Assert.Contains("api/test-probe/protected", routes);
    }

    [Fact]
    public async Task No_span_log_or_metric_holds_a_query_string_token_contact_detail_body_or_path_value()
    {
        using var client = _factory.CreateMemberClient(Guid.NewGuid());
        client.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", Token);

        using var read = await client.GetAsync($"/api/test-probe/open?q={ContactDetail}", TestContext.Current.CancellationToken);
        using var write = await client.PostAsJsonAsync("/api/test-probe/echo", new { name = MessageText }, TestContext.Current.CancellationToken);
        using var failure = await client.GetAsync($"/api/test-probe/fail/{PathValue}?q={ContactDetail}", TestContext.Current.CancellationToken);
        await _factory.Recorder.WaitForServerSpanAsync("api/test-probe/open");
        await _factory.Recorder.WaitForServerSpanAsync("api/test-probe/echo");
        await _factory.Recorder.WaitForServerSpanAsync("api/test-probe/fail/{kind}");
        _factory.FlushMetrics();
        _factory.FlushLogs();

        Assert.Equal(HttpStatusCode.InternalServerError, failure.StatusCode);
        Assert.Contains(_factory.ExportedLogs, log => log.LogLevel == Microsoft.Extensions.Logging.LogLevel.Error);

        var recorded = string.Join('\n', _factory.EverythingRecorded());
        foreach (var secret in new[] { ContactDetail, "q=", Token, "secret-token", MessageText, "604-555", PathValue })
        {
            Assert.DoesNotContain(secret, recorded, StringComparison.OrdinalIgnoreCase);
        }
    }

    /// <summary>The API with in-memory exporters behind the scrubber.</summary>
    private sealed class TelemetryApiFactory : ProbeApiFactory
    {
        public SpanRecorder Recorder { get; } = new();

        public List<Metric> Metrics { get; } = [];

        public List<LogRecord> ExportedLogs { get; } = [];

        public void FlushMetrics() => Services.GetRequiredService<MeterProvider>().ForceFlush();

        public void FlushLogs() => Services.GetRequiredService<LoggerProvider>().ForceFlush();

        public IEnumerable<string> EverythingRecorded()
        {
            foreach (var span in Recorder.Spans)
            {
                yield return span.DisplayName;
                yield return span.StatusDescription ?? "";
                foreach (var tag in span.TagObjects)
                {
                    yield return $"{tag.Key}={tag.Value}";
                }

                foreach (var spanEvent in span.Events)
                {
                    yield return spanEvent.Name;
                    foreach (var tag in spanEvent.Tags)
                    {
                        yield return $"{tag.Key}={tag.Value}";
                    }
                }
            }

            foreach (var log in ExportedLogs)
            {
                yield return log.FormattedMessage ?? "";
                yield return log.Body ?? "";
                yield return log.Exception?.Message ?? "";
                foreach (var attribute in log.Attributes ?? [])
                {
                    yield return $"{attribute.Key}={attribute.Value}";
                }
            }

            foreach (var metric in Metrics)
            {
                foreach (var point in metric.GetMetricPoints())
                {
                    foreach (var tag in point.Tags)
                    {
                        yield return $"{tag.Key}={tag.Value}";
                    }
                }
            }
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            base.ConfigureTestServices(services);
            services.ConfigureOpenTelemetryTracerProvider(tracing => tracing.AddProcessor(Recorder));
            services.ConfigureOpenTelemetryMeterProvider(metrics => metrics.AddInMemoryExporter(Metrics));
            services.ConfigureOpenTelemetryLoggerProvider(logging => logging.AddInMemoryExporter(ExportedLogs));
        }
    }
}

[CollectionDefinition(Name, DisableParallelization = true)]
public sealed class TelemetryTestGroup
{
    public const string Name = "Telemetry";
}
