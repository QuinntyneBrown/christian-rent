namespace ChristianRent.Application.Members;

/// <summary>Who a member is, as the frontend's session needs it (become-member design).</summary>
public sealed record MemberDto(Guid Id, string Name, bool IsVerified, bool IsAdmin);
