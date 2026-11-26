using OpenTelemetry;
using OpenTelemetry.Logs;
using OpenTelemetry.Metrics;
using OpenTelemetry.Resources;
using OpenTelemetry.Trace;

namespace ChristianRent.Api.Telemetry;

/// <summary>
/// OpenTelemetry traces, metrics and logs (L2-034, criterion 2), exported over OTLP to
/// <c>OTEL_EXPORTER_OTLP_ENDPOINT</c> when it is set. <see cref="TelemetryScrubber"/> runs before
/// any exporter. Logs from ASP.NET Core's hosting diagnostics, which quote the full URL, are kept
/// out below Warning.
/// </summary>
internal static class TelemetryExtensions
{
    public const string ServiceName = "christian-rent-api";

    public static WebApplicationBuilder AddTelemetry(this WebApplicationBuilder builder)
    {
        builder.Logging.AddFilter<OpenTelemetryLoggerProvider>("Microsoft.AspNetCore.Hosting.Diagnostics", LogLevel.Warning);
        builder.Logging.AddFilter<OpenTelemetryLoggerProvider>("Microsoft.AspNetCore.HttpLogging", LogLevel.None);
        builder.Logging.AddOpenTelemetry(logging =>
        {
            logging.IncludeFormattedMessage = true;
            logging.IncludeScopes = false;
        });

        var telemetry = builder.Services.AddOpenTelemetry()
            .ConfigureResource(resource => resource.AddService(ServiceName))
            .WithTracing(tracing => tracing
                .AddProcessor<TelemetryScrubber>()
                .AddAspNetCoreInstrumentation(options =>
                {
                    options.RecordException = false;
                    options.Filter = context => !context.Request.Path.StartsWithSegments("/health", StringComparison.Ordinal);
                })
                .AddHttpClientInstrumentation(options => options.RecordException = false))
            .WithMetrics(metrics => metrics
                .AddAspNetCoreInstrumentation()
                .AddHttpClientInstrumentation())
            .WithLogging();

        if (!string.IsNullOrWhiteSpace(builder.Configuration["OTEL_EXPORTER_OTLP_ENDPOINT"]))
        {
            telemetry.UseOtlpExporter();
        }

        return builder;
    }
}
