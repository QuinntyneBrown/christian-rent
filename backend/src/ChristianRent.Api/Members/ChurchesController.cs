using ChristianRent.Api.Access;
using ChristianRent.Application.Members;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Members;

[ApiController]
[Route("api/churches")]
public sealed class ChurchesController(ISender sender) : ControllerBase
{
    /// <summary>
    /// The churches to pick from when joining: a signed-in person, member or not (L2-025,
    /// criterion 5; ADR 0017).
    /// </summary>
    [HttpGet]
    public Task<IReadOnlyList<ChurchOptionDto>> List(CancellationToken cancellationToken) =>
        sender.Send(new ListChurchesQuery(), cancellationToken);

    /// <summary>
    /// An admin confirms a church. Anyone else is refused before it is looked for, so they
    /// learn nothing of which churches exist (L2-018, criteria 5 and 11).
    /// </summary>
    [HttpPost("{id}/verification")]
    [Authorize(Policy = AccessExtensions.AdminPolicy)]
    public async Task<IActionResult> Verify(string id, CancellationToken cancellationToken)
    {
        await sender.Send(new VerifyChurchCommand(id), cancellationToken);
        return NoContent();
    }
}
