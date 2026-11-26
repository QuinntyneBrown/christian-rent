using System.Threading.RateLimiting;

namespace ChristianRent.Api.Security;

/// <summary>
/// A fixed-window limiter that measures time with <see cref="TimeProvider"/>, so tests advance a
/// fake clock instead of sleeping (ADR 0009). It never queues: a request over the limit is refused
/// at once, with how long until the window ends.
/// </summary>
public sealed class TimeProviderFixedWindowLimiter(int permitLimit, TimeSpan window, TimeProvider clock) : RateLimiter
{
    private readonly Lock _gate = new();
    private DateTimeOffset _windowStart = DateTimeOffset.MinValue;
    private int _used;

    public override TimeSpan? IdleDuration
    {
        get
        {
            lock (_gate)
            {
                var sinceWindowEnded = clock.GetUtcNow() - (_windowStart + window);
                return sinceWindowEnded >= TimeSpan.Zero ? sinceWindowEnded : null;
            }
        }
    }

    public override RateLimiterStatistics GetStatistics()
    {
        lock (_gate)
        {
            return new RateLimiterStatistics { CurrentAvailablePermits = permitLimit - _used };
        }
    }

    protected override RateLimitLease AttemptAcquireCore(int permitCount)
    {
        lock (_gate)
        {
            var now = clock.GetUtcNow();
            if (now >= _windowStart + window)
            {
                _windowStart = now;
                _used = 0;
            }

            if (_used + permitCount <= permitLimit)
            {
                _used += permitCount;
                return Lease.Granted;
            }

            return Lease.Refused(_windowStart + window - now);
        }
    }

    protected override ValueTask<RateLimitLease> AcquireAsyncCore(int permitCount, CancellationToken cancellationToken) =>
        ValueTask.FromResult(AttemptAcquireCore(permitCount));

    private sealed class Lease(bool isAcquired, TimeSpan? retryAfter) : RateLimitLease
    {
        public static readonly Lease Granted = new(true, null);

        public override bool IsAcquired { get; } = isAcquired;

        public override IEnumerable<string> MetadataNames =>
            retryAfter is null ? [] : [MetadataName.RetryAfter.Name];

        public static Lease Refused(TimeSpan retryAfter) => new(false, retryAfter);

        public override bool TryGetMetadata(string metadataName, out object? metadata)
        {
            if (retryAfter is TimeSpan value && metadataName == MetadataName.RetryAfter.Name)
            {
                metadata = value;
                return true;
            }

            metadata = null;
            return false;
        }
    }
}
