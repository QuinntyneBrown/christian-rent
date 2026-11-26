using System.Threading.RateLimiting;
using ChristianRent.Api.Security;
using Microsoft.Extensions.Time.Testing;

namespace ChristianRent.Api.Tests;

/// <summary>Direct tests of the limiter behind the rate limits (ADR 0009), one case per row.</summary>
public sealed class TimeProviderFixedWindowLimiterTests
{
    private readonly FakeTimeProvider _clock = new(new DateTimeOffset(2026, 6, 8, 15, 0, 0, TimeSpan.Zero));

    [Theory]
    [InlineData(0, 3, true)]
    [InlineData(0, 4, false)]
    [InlineData(59, 4, false)]
    [InlineData(60, 4, true)]
    public void Grants_up_to_the_limit_in_a_window(int secondsBeforeLast, int attempts, bool lastGranted)
    {
        using var limiter = new TimeProviderFixedWindowLimiter(3, TimeSpan.FromMinutes(1), _clock);

        for (var i = 1; i < attempts; i++)
        {
            using var lease = limiter.AttemptAcquire();
        }

        _clock.Advance(TimeSpan.FromSeconds(secondsBeforeLast));
        using var last = limiter.AttemptAcquire();

        Assert.Equal(lastGranted, last.IsAcquired);
    }

    [Fact]
    public void A_refusal_says_how_long_until_the_window_ends()
    {
        using var limiter = new TimeProviderFixedWindowLimiter(1, TimeSpan.FromMinutes(1), _clock);
        using var first = limiter.AttemptAcquire();
        _clock.Advance(TimeSpan.FromSeconds(45));

        using var refused = limiter.AttemptAcquire();

        Assert.False(refused.IsAcquired);
        Assert.True(refused.TryGetMetadata(MetadataName.RetryAfter, out var retryAfter));
        Assert.Equal(TimeSpan.FromSeconds(15), retryAfter);
    }

    [Fact]
    public void Is_idle_once_its_window_has_passed()
    {
        using var limiter = new TimeProviderFixedWindowLimiter(1, TimeSpan.FromMinutes(1), _clock);
        using var lease = limiter.AttemptAcquire();

        Assert.Null(limiter.IdleDuration);
        _clock.Advance(TimeSpan.FromMinutes(3));
        Assert.Equal(TimeSpan.FromMinutes(2), limiter.IdleDuration);
    }
}
