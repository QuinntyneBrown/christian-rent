using System.Security.Claims;
using ChristianRent.Application.Abstractions;
using Microsoft.AspNetCore.Http;

namespace ChristianRent.Infrastructure.Identity;

/// <summary>
/// Reads the caller from the authenticated principal: the claim <c>member_id</c>, and the role
/// <c>admin</c> (ADR 0005). Nobody is signed in until sign-in is designed.
/// </summary>
public sealed class HttpCurrentMember(IHttpContextAccessor accessor) : ICurrentMember
{
    public const string MemberIdClaim = "member_id";
    public const string AdminRole = "admin";

    public Guid? MemberId =>
        Guid.TryParse(accessor.HttpContext?.User.FindFirstValue(MemberIdClaim), out var id) ? id : null;

    public bool IsMember => MemberId is not null;

    public bool IsAdmin => IsMember && accessor.HttpContext?.User.IsInRole(AdminRole) == true;
}
