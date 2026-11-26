using System.Diagnostics;
using OpenTelemetry;

namespace ChristianRent.Api.Tests.Support;

/// <summary>
/// Records every span as it ends and lets a test await one, with a timeout that fails naming the
/// spans that did arrive. A server span can end just after the client has its response.
/// </summary>
public sealed class SpanRecorder : BaseProcessor<Activity>
{
    private readonly Lock _gate = new();
    private readonly List<Activity> _spans = [];
    private readonly List<(Func<Activity, bool> Match, TaskCompletionSource<Activity> Arrived)> _waiters = [];

    public IReadOnlyList<Activity> Spans
    {
        get
        {
            lock (_gate)
            {
                return [.. _spans];
            }
        }
    }

    public override void OnEnd(Activity data)
    {
        lock (_gate)
        {
            _spans.Add(data);
            foreach (var waiter in _waiters.Where(waiter => waiter.Match(data)).ToList())
            {
                waiter.Arrived.TrySetResult(data);
                _waiters.Remove(waiter);
            }
        }
    }

    public async Task<Activity> WaitForServerSpanAsync(string route)
    {
        bool Match(Activity span) => span.Kind == ActivityKind.Server && Equals(span.GetTagItem("http.route"), route);

        TaskCompletionSource<Activity> arrived;
        lock (_gate)
        {
            var existing = _spans.FirstOrDefault(Match);
            if (existing is not null)
            {
                return existing;
            }

            arrived = new TaskCompletionSource<Activity>(TaskCreationOptions.RunContinuationsAsynchronously);
            _waiters.Add((Match, arrived));
        }

        try
        {
            return await arrived.Task.WaitAsync(TimeSpan.FromSeconds(5), TestContext.Current.CancellationToken);
        }
        catch (TimeoutException)
        {
            var seen = string.Join(", ", Spans.Select(span => $"{span.Kind} {span.GetTagItem("http.route")}"));
            throw new TimeoutException($"No server span for route '{route}' arrived. Spans that did: [{seen}]");
        }
    }
}
