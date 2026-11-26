using ChristianRent.Application.Listings;

namespace ChristianRent.Application.Review;

/// <summary>
/// One waiting review item in full (view-review-queue design). <c>Kind</c> says which one of
/// <c>Listing</c>, <c>Report</c> and <c>Member</c> is set; the others are null. A decision sends
/// <c>Version</c> back, and is one of <c>AllowedDecisions</c> (decide-review-item design).
/// </summary>
public sealed record ReviewItemDetailDto(
    Guid Id,
    string Kind,
    DateTimeOffset WaitingSince,
    ReviewListingDto? Listing,
    ReportDetailDto? Report,
    NewMemberDetailDto? Member,
    int Version,
    IReadOnlyList<string> AllowedDecisions);

/// <summary>
/// A listing as an admin decides on it (L2-019, criteria 7 and 15): every field, every photo in
/// the member's order, who posted it and when.
/// </summary>
public sealed record ReviewListingDto(
    Guid Id,
    string Offer,
    string Kind,
    string Title,
    PriceDto? Price,
    WhenDto When,
    string Area,
    string? Note,
    IReadOnlyList<ReviewPhotoDto> Photos,
    ReviewPosterDto Poster,
    DateTimeOffset PostedAt);

/// <summary>A photo's <c>gallery</c> and <c>thumb</c> renditions and its text alternative (ADR 0011).</summary>
public sealed record ReviewPhotoDto(string Url, string ThumbUrl, string? Description);

/// <summary>Who posted the listing, with both verified marks and since when they are a member.</summary>
public sealed record ReviewPosterDto(string Name, bool IsVerified, DateTimeOffset JoinedAt, ChurchDto Church);

/// <summary>
/// A report (L2-019, criterion 8): the reason (<c>fake</c>, <c>inappropriate</c>, <c>scam</c> or
/// <c>other</c>), the note, when it was reported, since when the listing has been public, and the
/// listing. It has no field for the reporter, so none can be sent (L2-021, criterion 4).
/// </summary>
public sealed record ReportDetailDto(
    string Reason,
    string? Note,
    DateTimeOffset ReportedAt,
    DateTimeOffset PublicSince,
    ReviewListingDto Listing);

/// <summary>
/// A new member (L2-019, criteria 9, 16 and 17). The listing counts leave out removed ones;
/// <c>PublicCount</c> is how many of them anyone may see.
/// </summary>
public sealed record NewMemberDetailDto(
    string Name,
    DateTimeOffset JoinedAt,
    NewMemberChurchDto Church,
    int ListingCount,
    int ForRentCount,
    int PublicCount,
    int MessageCount);

/// <summary>A new member's church, and who entered it when that is recorded.</summary>
public sealed record NewMemberChurchDto(string Name, string City, bool IsVerified, ChurchEntrantDto? EnteredBy);

/// <summary>The member who entered a church, and whether that is the member being decided on.</summary>
public sealed record ChurchEntrantDto(string Name, bool IsThisMember);
