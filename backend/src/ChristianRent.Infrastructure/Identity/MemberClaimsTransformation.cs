using System.Security.Claims;
using ChristianRent.Domain.Members;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authentication;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Infrastructure.Identity;

/// <summary>
/// Turns a signed-in person into the member they are (ADR 0017): for a principal with a
/// <c>sub</c> and no <c>member_id</c>, it finds the active member with that sign-in identifier
/// and adds <c>member_id</c> and, for an admin, the role <c>admin</c>. A person who is not, or is
/// no longer, a member gets nothing. It may run more than once a request; once is enough.
/// </summary>
public sealed class MemberClaimsTransformation(AppDbContext database) : IClaimsTransformation
{
    public async Task<ClaimsPrincipal> TransformAsync(ClaimsPrincipal principal)
    {
        var signInId = principal.FindFirstValue(HttpCurrentMember.SignInIdClaim);
        if (string.IsNullOrEmpty(signInId) || principal.HasClaim(claim => claim.Type == HttpCurrentMember.MemberIdClaim))
        {
            return principal;
        }

        var member = await database.Members
            .AsNoTracking()
            .Where(member => member.SignInId == signInId && member.Status == MemberStatus.Active)
            .Select(member => new { member.Id, member.IsAdmin })
            .FirstOrDefaultAsync();
        if (member is null)
        {
            return principal;
        }

        var claims = new List<Claim> { new(HttpCurrentMember.MemberIdClaim, member.Id.ToString()) };
        if (member.IsAdmin)
        {
            claims.Add(new Claim(ClaimTypes.Role, HttpCurrentMember.AdminRole));
        }

        var transformed = principal.Clone();
        transformed.AddIdentity(new ClaimsIdentity(claims));
        return transformed;
    }
}
