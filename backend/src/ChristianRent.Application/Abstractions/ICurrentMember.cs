namespace ChristianRent.Application.Abstractions;

/// <summary>
/// Who is calling, resolved once per request. Handlers read it to check membership and
/// ownership; sign-in will sit behind it (ADR 0005).
/// </summary>
public interface ICurrentMember
{
    /// <summary>The member's identifier, or null when nobody is signed in.</summary>
    Guid? MemberId { get; }

    bool IsMember { get; }

    bool IsAdmin { get; }
}
