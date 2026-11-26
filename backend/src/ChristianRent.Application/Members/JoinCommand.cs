using MediatR;

namespace ChristianRent.Application.Members;

/// <summary>
/// A signed-in person becomes a member: their name, an existing church or a new one with its
/// city, and the declaration that they are a Christian (L2-017, criteria 1 and 2).
/// </summary>
public sealed record JoinCommand(
    string? Name,
    Guid? ChurchId,
    string? NewChurchName,
    string? NewChurchCity,
    bool DeclaresChristian) : IRequest<JoinResult>;

/// <summary>The member, and whether joining created them or they already were one.</summary>
public sealed record JoinResult(MemberDto Member, bool Created);
