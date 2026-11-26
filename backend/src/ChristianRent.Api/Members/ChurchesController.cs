using ChristianRent.Application.Members;
using MediatR;
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
}
