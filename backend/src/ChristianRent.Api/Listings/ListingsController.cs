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
    /// switch (<c>show</c>), the kind filter (<c>kind</c>) and the search term (<c>q</c>,
    /// ADR 0015).
    /// </summary>
    [HttpGet]
    [AllowAnonymous]
    public Task<ListingsPageDto> Browse(
        [FromQuery] string? cursor,
        [FromQuery] string? show,
        [FromQuery] string? kind,
        [FromQuery] string? q,
        CancellationToken cancellationToken,
        [FromQuery] int size = BrowseListingsQuery.DefaultSize) =>
        sender.Send(new BrowseListingsQuery(cursor, size, show, q, kind), cancellationToken);

    /// <summary>
    /// One listing: anyone may read an approved one (L2-007; L2-025, criterion 1). The handler
    /// answers <c>not_found</c> for anything else, an address that is not an identifier included.
    /// </summary>
    [HttpGet("{id}")]
    [AllowAnonymous]
    public Task<ListingDetailDto> Get(string id, CancellationToken cancellationToken) =>
        sender.Send(new GetListingQuery(id), cancellationToken);

    /// <summary>
    /// A member posts a listing, which waits for review (L2-012): 201 the first time, 200 when
    /// the same client request was already posted. Membership is checked by the handler.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Post(PostListingCommand command, CancellationToken cancellationToken)
    {
        var result = await sender.Send(command, cancellationToken);
        return result.Created ? Created($"/api/listings/{result.Listing.Id}", result.Listing) : Ok(result.Listing);
    }
}
