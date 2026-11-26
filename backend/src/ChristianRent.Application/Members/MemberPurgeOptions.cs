namespace ChristianRent.Application.Members;

/// <summary>
/// The setting <c>Members:PurgeAfterDays</c>: how many days after leaving a member is made
/// anonymous, 0 to 30; 30 when it is not set (L2-028, criterion 2).
/// </summary>
public sealed class MemberPurgeOptions
{
    public const string Section = "Members";
    public const int MaxDays = 30;

    public int PurgeAfterDays { get; set; } = MaxDays;
}
