using ChristianRent.Application.Listings;

namespace ChristianRent.Application.Review;

/// <summary>
/// One item of the review queue with everything needed to decide it (L2-019, criterion 2). It
/// holds <c>Listing</c> for a new listing and a report, <c>Report</c> for a report, and
/// <c>Member</c> for a new member; the others are null. <c>Decisions</c> are those its kind
/// allows (L2-020, criterion 8).
/// </summary>
public sealed record ReviewItemDetailDto(
    Guid Id,
    string Kind,
    IReadOnlyList<string> Decisions,
    DateTimeOffset WaitingSince,
    ReviewListingDto? Listing,
    ReviewReportDto? Report,
    ReviewMemberDto? Member);

/// <summary>
/// The listing of a new listing or a report, with all its fields and photos (L2-019,
/// criterion 7). <c>ApprovedAt</c> is since when it has been public, null while it waits.
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
    DateTimeOffset PostedAt,
    DateTimeOffset? ApprovedAt,
    IReadOnlyList<ListingPhotoDto> Photos,
    ReviewPosterDto Poster);

/// <summary>Who posted the listing, since when they have been a member, and their church.</summary>
public sealed record ReviewPosterDto(string Name, bool IsVerified, DateTimeOffset MemberSince, ChurchDto Church);

/// <summary>
/// A report: its reason as the API words it (ADR 0023), the note, and when it was made. It never
/// names the reporter (L2-019, criterion 8; L2-021, criterion 4).
/// </summary>
public sealed record ReviewReportDto(string Reason, string? Note, DateTimeOffset ReportedAt);

/// <summary>
/// A new member (L2-019, criterion 9): their name, when they joined, their church, their
/// listings and how many messages they have sent. Joining required the declaration, so every
/// member has made it.
/// </summary>
public sealed record ReviewMemberDto(
    string Name,
    DateTimeOffset JoinedAt,
    ReviewChurchDto Church,
    ReviewMemberListingsDto Listings,
    int MessagesSent);

/// <summary>
/// The member's church with its city, whether an admin has confirmed it, and who entered it
/// (ADR 0024): this member, another named one, or nobody.
/// </summary>
public sealed record ReviewChurchDto(string Name, string City, bool IsVerified, bool EnteredByThisMember, string? EnteredByName);

/// <summary>How many listings the member has for rent and wanted, and how many are public.</summary>
public sealed record ReviewMemberListingsDto(int ForRent, int Wanted, int Public);
