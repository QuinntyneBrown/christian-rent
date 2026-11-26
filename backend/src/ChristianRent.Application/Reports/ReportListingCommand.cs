using MediatR;

namespace ChristianRent.Application.Reports;

/// <summary>
/// A member reports a listing so an admin reviews it (report-listing design).
/// <see cref="ListingId"/> is the address's text, so one that is not an identifier is answered
/// like an unknown listing; <see cref="Reason"/> is the request's word for a reason.
/// </summary>
public sealed record ReportListingCommand(string ListingId, string? Reason, string? Note) : IRequest<ReportedDto>;

/// <summary>What the request's body carries; the listing comes from the address.</summary>
public sealed record ReportListingRequest(string? Reason, string? Note);

/// <summary>
/// What the API answers about a report: when it was filed, and never its reporter or its note
/// (L2-021, criterion 4).
/// </summary>
public sealed record ReportedDto(DateTimeOffset ReportedAt);
