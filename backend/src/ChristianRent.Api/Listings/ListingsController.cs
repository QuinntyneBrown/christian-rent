using ChristianRent.Application.Listings;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Listings;

[ApiController]
[Route("api/listings")]
public sealed class ListingsController(ISender sender) : ControllerBase
{
    /// <summary>
    /// Browse: anyone may read approved listings (L2-001, criterion 1; L2-025), narrowed by the
    /// switch (<c>show</c>) and the search term (<c>q</c>, ADR 0015).
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public Task<ListingsPageDto> Browse(
        [FromQuery] string? cursor,
        [FromQuery] string? show,
        [FromQuery] string? q,
        CancellationToken cancellationToken,
        [FromQuery] int size = BrowseListingsQuery.DefaultSize) =>
        sender.Send(new BrowseListingsQuery(cursor, size, show, q), cancellationToken);
}
