using ChristianRent.Domain.Listings;

namespace ChristianRent.Domain.Reports;

/// <summary>
/// A member's complaint about one listing (report-listing design). It waits in the review queue.
/// The member who posted the listing is never told who reported (L2-021, criterion 4), so no
/// answer of the API carries <see cref="ReporterId"/>.
/// </summary>
public sealed class Report
{
    public const int MaxNoteLength = 500;

    private Report(Guid id, Guid listingId, Guid reporterId, ReportReason reason, string? note, DateTimeOffset createdAt)
    {
        Id = id;
        ListingId = listingId;
        ReporterId = reporterId;
        Reason = reason;
        Note = note;
        CreatedAt = createdAt;
        Status = ReportStatus.Open;
    }

    public Guid Id { get; private set; }

    public Guid ListingId { get; private set; }

    public Guid ReporterId { get; private set; }

    public ReportReason Reason { get; private set; }

    /// <summary>What the reporter added, as text; null when nothing was.</summary>
    public string? Note { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    public ReportStatus Status { get; private set; }

    /// <summary>
    /// A member reports a listing. The command's validator and handler have checked the reason,
    /// the note and who is reporting.
    /// </summary>
    public static Report File(Listing listing, Guid reporterId, ReportReason reason, string? note, DateTimeOffset now) =>
        new(Guid.NewGuid(), listing.Id, reporterId, reason, note, now);

    /// <summary>An admin has decided it (L2-020, criteria 2 and 7).</summary>
    public void Close() => Status = ReportStatus.Closed;

    /// <summary>Its reporter has left: what they wrote goes, and the report keeps its place.</summary>
    public void ClearNote() => Note = null;
}
