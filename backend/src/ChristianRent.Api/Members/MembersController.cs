using ChristianRent.Application.Members;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Members;

/// <summary>
/// Joining and asking who one is: a signed-in person, member or not (L2-025, criterion 5;
/// ADR 0017). Each action sends one request and checks nothing itself.
/// </summary>
[ApiController]
[Route("api/members")]
public sealed class MembersController(ISender sender) : ControllerBase
{
    /// <summary>Becomes a member: 201 the first time, 200 for someone who already is one.</summary>
    [HttpPost]
    public async Task<IActionResult> Join(JoinCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Created ? Created("/api/members/me", result.Member) : Ok(result.Member);
    }

    /// <summary>The caller as a member, or 204 for a signed-in person who is not one.</summary>
    [HttpGet("me")]
    public async Task<IActionResult> Me(CancellationToken cancellationToken) =>
        await sender.Send(new GetCurrentMemberQuery(), cancellationToken) is { } member ? Ok(member) : NoContent();

    /// <summary>The member leaves; their listings and photos stop being public at once (L2-028).</summary>
    [HttpDelete("me")]
    public async Task<IActionResult> Leave(CancellationToken cancellationToken)
    {
        await sender.Send(new DeleteMembershipCommand(), cancellationToken);
        return NoContent();
    }
}
