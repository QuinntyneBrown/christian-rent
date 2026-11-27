using ChristianRent.Api.Access;
using ChristianRent.Application.Members;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Members;

/// <summary>
/// What an admin signed in to Admin does with a church. Anyone else, including a member session,
/// is answered 401 <c>not_signed_in</c> or 403 <c>not_an_admin</c>, alike whether the church
/// exists or not (L2-018, criteria 5 and 11; ADR 0029).
/// </summary>
[ApiController]
[Route("api/admin/churches")]
[Authorize(Policy = AccessExtensions.AdminPolicy)]
public sealed class AdminChurchesController(ISender sender) : ControllerBase
{
    /// <summary>The admin confirms the church: it is verified from now on (L2-018, criterion 2).</summary>
    [HttpPost("{id}/verification")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<NoContentResult> Verify(string id, CancellationToken cancellationToken)
    {
        await sender.Send(new VerifyChurchCommand(id), cancellationToken);
        return NoContent();
    }
}
