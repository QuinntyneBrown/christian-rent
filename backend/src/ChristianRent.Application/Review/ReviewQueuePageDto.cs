namespace ChristianRent.Application.Review;

/// <summary>
/// At most one page of the review queue, the cursor of the next page, and how many items wait
/// in all (L2-019, criteria 6 and 10).
/// </summary>
public sealed record ReviewQueuePageDto(IReadOnlyList<ReviewItemSummaryDto> Items, string? NextCursor, int WaitingCount);

/// <summary>
/// One row of the queue (L2-019, criterion 6). <c>Kind</c> is <c>new-listing</c>, <c>report</c>
/// or <c>new-member</c>. <c>Title</c> is the listing's title or the member's name, and
/// <c>Who</c> is who posted the listing or the member's church. <c>Offer</c> is the listing's,
/// null for a member; <c>ThumbUrl</c> is the listing's first photo for rent, when it has one.
/// No answer names a reporter (L2-021, criterion 4).
/// </summary>
public sealed record ReviewItemSummaryDto(
    Guid Id,
    string Kind,
    string Title,
    string Who,
    DateTimeOffset WaitingSince,
    string? Offer,
    string? ThumbUrl);
