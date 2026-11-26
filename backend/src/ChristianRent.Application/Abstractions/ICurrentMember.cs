using ChristianRent.Application.Errors;

namespace ChristianRent.Application.Abstractions;

/// <summary>
/// Who is calling, resolved once per request. Handlers read it to check membership and
/// ownership; sign-in will sit behind it (ADR 0005, ADR 0017).
/// </summary>
public interface ICurrentMember
{
    /// <summary>The signed-in person's sign-in identifier, member or not; null when nobody is signed in.</summary>
    string? SignInId { get; }

    /// <summary>The active member's identifier, or null when the caller is not an active member.</summary>
    Guid? MemberId { get; }

    bool IsMember { get; }

    bool IsAdmin { get; }
}

public static class CurrentMemberExtensions
{
    /// <summary>
    /// The caller's member identifier; anyone who is not an active member is refused with
    /// <c>not_a_member</c> (L2-017, criterion 5).
    /// </summary>
    public static Guid RequireMember(this ICurrentMember caller) =>
        caller.MemberId ?? throw new ForbiddenException("not_a_member");
}
