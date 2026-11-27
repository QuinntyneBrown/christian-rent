using ChristianRent.Api.Access;
using ChristianRent.Application.Review;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Review;

/// <summary>
/// The review queue, for an admin alone: anyone else is answered 401 <c>not_signed_in</c> or 403
/// <c>not_an_admin</c>, with no queue data (L2-019, criterion 5).
/// </summary>
[ApiController]
[Route("api/review-queue")]
[Authorize(Policy = AccessExtensions.AdminPolicy)]
public sealed class ReviewQueueController(ISender sender) : ControllerBase
{
    /// <summary>One page of what waits, oldest first (L2-019, criteria 1 and 4).</summary>
    [HttpGet]
    public Task<ReviewQueuePageDto> List(
        [FromQuery] string? cursor,
        CancellationToken cancellationToken,
        [FromQuery] int size = GetReviewQueueQuery.MaxSize) =>
        sender.Send(new GetReviewQueueQuery(cursor, size), cancellationToken);

    /// <summary>What has arrived since the queue was read (L2-019, criterion 12).</summary>
    [HttpGet("arrivals")]
    public Task<ReviewArrivalsDto> Arrivals([FromQuery] string? since, CancellationToken cancellationToken) =>
        sender.Send(new GetReviewArrivalsQuery(since), cancellationToken);

    /// <summary>Everything needed to decide on one waiting item (L2-019, criterion 2).</summary>
    [HttpGet("{id}")]
    public Task<ReviewItemDetailDto> Get(string id, CancellationToken cancellationToken) =>
        sender.Send(new GetReviewItemQuery(id), cancellationToken);

    /// <summary>The admin decides the item; the answer names every item that closed (L2-020).</summary>
    [HttpPost("{id}/decision")]
    public Task<DecidedDto> Decide(string id, DecisionRequest request, CancellationToken cancellationToken) =>
        sender.Send(new DecideReviewItemCommand(id, request.Decision, request.Version), cancellationToken);
}
