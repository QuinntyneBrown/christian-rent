using System.Diagnostics;
using OpenTelemetry;

namespace ChristianRent.Api.Telemetry;

/// <summary>
/// Removes from every span what could hold personal data or a secret, before any exporter sees
/// it (fail-clearly-and-operate design; L2-028, criterion 3): the query string, the full URL and
/// the path with its values, request and response headers, bodies, database statements, and
/// exception messages. Exception events are never recorded (<c>RecordException</c> is off). The route is kept as its template (<c>http.route</c>).
/// </summary>
public sealed class TelemetryScrubber : BaseProcessor<Activity>
{
    private static readonly HashSet<string> RemovedTags = new(StringComparer.Ordinal)
    {
        "url.query",
        "url.full",
        "url.path",
        "http.target",
        "http.url",
        "user_agent.original",
        "client.address",
        "db.statement",
        "db.query.text",
        "exception.message",
        "exception.stacktrace",
        "otel.status_description",
    };

    private static readonly string[] RemovedPrefixes =
    [
        "http.request.header.",
        "http.response.header.",
        "http.request.body",
        "http.response.body",
    ];

    public override void OnEnd(Activity data)
    {
        var doomed = data.TagObjects
            .Select(tag => tag.Key)
            .Where(key => RemovedTags.Contains(key) || RemovedPrefixes.Any(prefix => key.StartsWith(prefix, StringComparison.Ordinal)))
            .ToList();
        foreach (var key in doomed)
        {
            data.SetTag(key, null);
        }

        if (data.Status == ActivityStatusCode.Error)
        {
            // Keep the outcome, drop its description, which can quote an exception message.
            data.SetStatus(ActivityStatusCode.Error);
        }
    }
}
