namespace ChristianRent.Api.Access;

/// <summary>The <c>Sessions</c> settings (README, Settings; L2-040, criterion 1).</summary>
public sealed class SessionOptions
{
    public const string Section = "Sessions";

    /// <summary>How long a member session lasts without a request; each request extends it.</summary>
    public TimeSpan MemberLifetime { get; set; } = TimeSpan.FromDays(14);

    /// <summary>How long an Admin session lasts from sign-in, whatever the admin does.</summary>
    public TimeSpan AdminLifetime { get; set; } = TimeSpan.FromHours(8);
}
