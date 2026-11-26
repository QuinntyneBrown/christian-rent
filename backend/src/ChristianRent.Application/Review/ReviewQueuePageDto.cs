namespace ChristianRent.Application.Review;

/// <summary>
/// At most one page of review items, the cursor of the next page, and how many wait in all
/// (view-review-queue design).
/// </summary>
public sealed record ReviewQueuePageDto(IReadOnlyList<ReviewItemSummaryDto> Items, string? NextCursor, int WaitingCount);

/// <summary>
/// One row of the review queue (L2-019, criterion 6). <c>Kind</c> is <c>new-listing</c>,
/// <c>report</c> or <c>new-member</c>. <c>Title</c> is the listing's title or the member's name,
/// <c>Who</c> the member who posted or a new member's church. <c>Offer</c> is the listing's, and
/// null for a new member; <c>ThumbUrl</c> is the first photo of a listing for rent. A report's
/// row says nothing about who reported (criterion 8).
/// </summary>
public sealed record ReviewItemSummaryDto(
    Guid Id,
    string Kind,
    string Title,
    string Who,
    DateTimeOffset WaitingSince,
    string? Offer,
    string? ThumbUrl);
