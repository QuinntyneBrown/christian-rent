namespace ChristianRent.Domain.Members;

/// <summary>
/// When an account stops accepting sign-in (L2-037, criterion 3; ADR 0029): after 5 refusals in a
/// row it is locked for 15 minutes, during which even the right password is refused; a successful
/// sign-in sets the count back to zero. Time is given, so the rule reads whatever clock the
/// caller has.
/// </summary>
public static class SignInLockout
{
    public const int MaxFailures = 5;
    public static readonly TimeSpan Duration = TimeSpan.FromMinutes(15);

    /// <summary>Whether an account locked until <paramref name="lockedUntil"/> is still locked at <paramref name="now"/>.</summary>
    public static bool IsLocked(DateTimeOffset? lockedUntil, DateTimeOffset now) => lockedUntil > now;

    /// <summary>The count and the lockout after one more refusal of a wrong password.</summary>
    public static (int Failures, DateTimeOffset? LockedUntil) AfterFailure(int failures, DateTimeOffset now) =>
        failures + 1 >= MaxFailures ? (0, now + Duration) : (failures + 1, null);
}
