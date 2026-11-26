using MediatR;

namespace ChristianRent.Application.Review;

/// <summary>
/// One page of the review queue, oldest first (L2-019, criteria 1 and 4). <see cref="Cursor"/>
/// is the <c>nextCursor</c> of the page before.
/// </summary>
public sealed record GetReviewQueueQuery(string? Cursor, int Size = GetReviewQueueQuery.MaxSize)
    : IRequest<ReviewQueuePageDto>
{
    /// <summary>The most a page holds, and what it holds unless fewer are asked for (L2-030, criterion 3).</summary>
    public const int MaxSize = 50;
}
