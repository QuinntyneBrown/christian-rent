using ChristianRent.Domain.Members;

namespace ChristianRent.Api.Tests;

/// <summary>L2-037 criterion 3 (ADR 0029): the lockout rule, one case per row of the design's table.</summary>
public sealed class SignInLockoutTests
{
    private static readonly DateTimeOffset Now = new(2026, 6, 8, 15, 0, 0, TimeSpan.Zero);

    [Theory]
    [InlineData(0, 1, false)]
    [InlineData(3, 4, false)]
    [InlineData(4, 0, true)]
    public void A_wrong_password_counts_and_the_fifth_locks_for_15_minutes(int failures, int after, bool locked)
    {
        var (count, lockedUntil) = SignInLockout.AfterFailure(failures, Now);

        Assert.Equal(after, count);
        Assert.Equal(locked ? Now.AddMinutes(15) : null, lockedUntil);
    }

    [Theory]
    [InlineData(-1, false)]
    [InlineData(0, false)]
    [InlineData(1, true)]
    public void An_account_is_locked_while_its_lockout_is_in_the_future(int minutesFromNow, bool locked) =>
        Assert.Equal(locked, SignInLockout.IsLocked(Now.AddMinutes(minutesFromNow), Now));

    [Fact]
    public void An_account_never_locked_is_not_locked() => Assert.False(SignInLockout.IsLocked(null, Now));
}
