using System.Security.Claims;
using ChristianRent.Application.Abstractions;
using Microsoft.AspNetCore.Http;

namespace ChristianRent.Infrastructure.Identity;

/// <summary>
/// Reads the caller from the authenticated principal: the sign-in identifier <c>sub</c>, and the
/// claim <c>member_id</c> and role <c>admin</c> that <see cref="MemberClaimsTransformation"/>
/// adds for an active member (ADR 0017, ADR 0029). The principal is the request's own session's.
/// </summary>
public sealed class HttpCurrentMember(IHttpContextAccessor accessor) : ICurrentMember
{
    public const string SignInIdClaim = "sub";
    public const string MemberIdClaim = "member_id";
    public const string AdminRole = "admin";

    public string? SignInId =>
        accessor.HttpContext?.User.FindFirstValue(SignInIdClaim) is { Length: > 0 } id ? id : null;

    public Guid? MemberId =>
        Guid.TryParse(accessor.HttpContext?.User.FindFirstValue(MemberIdClaim), out var id) ? id : null;

    public bool IsMember => MemberId is not null;

    public bool IsAdmin => IsMember && accessor.HttpContext?.User.IsInRole(AdminRole) == true;
}
