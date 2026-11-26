using ChristianRent.Application.Listings;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Listings;

[ApiController]
[Route("api/listings")]
public sealed class ListingsController(ISender sender) : ControllerBase
{
    /// <summary>Browse: anyone may read approved listings (L2-001, criterion 1; L2-025).</summary>
    [HttpGet]
    [AllowAnonymous]
    public Task<ListingsPageDto> Browse(
        [FromQuery] string? cursor,
        CancellationToken cancellationToken,
        [FromQuery] int size = BrowseListingsQuery.DefaultSize) =>
        sender.Send(new BrowseListingsQuery(cursor, size), cancellationToken);
}
