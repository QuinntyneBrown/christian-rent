using ChristianRent.Api.Access;
using ChristianRent.Application.Review;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Review;

/// <summary>
/// The review queue, for an admin only (L2-019, criterion 5): anyone else is refused with
/// <c>not_an_admin</c>, or <c>not_signed_in</c>, and receives no queue data.
/// </summary>
[ApiController]
[Route("api/review-queue")]
[Authorize(Policy = AccessExtensions.AdminPolicy)]
public sealed class ReviewQueueController(ISender sender) : ControllerBase
{
    /// <summary>One page of the waiting items, oldest first, by <c>cursor</c> (ADR 0024).</summary>
    [HttpGet]
    public Task<ReviewQueuePageDto> List([FromQuery] string? cursor, CancellationToken cancellationToken) =>
        sender.Send(new GetReviewQueueQuery(cursor), cancellationToken);

    /// <summary>
    /// One waiting item with everything needed to decide it (L2-019, criterion 2); anything
    /// else is <c>not_found</c>.
    /// </summary>
    [HttpGet("{id}")]
    public Task<ReviewItemDetailDto> Get(string id, CancellationToken cancellationToken) =>
        sender.Send(new GetReviewItemQuery(id), cancellationToken);

    /// <summary>
    /// Approve, Keep or Remove a waiting item (L2-020); a second decision is
    /// <c>already_decided</c> (ADR 0025).
    /// </summary>
    [HttpPost("{id}/decision")]
    public async Task<IActionResult> Decide(string id, [FromBody] DecisionRequest request, CancellationToken cancellationToken)
    {
        await sender.Send(new DecideReviewItemCommand(id, request.Decision), cancellationToken);
        return NoContent();
    }

    /// <summary>The body of a decision.</summary>
    public sealed record DecisionRequest(string? Decision);
}
