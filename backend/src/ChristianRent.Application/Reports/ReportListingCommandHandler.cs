using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using ChristianRent.Application.Listings;
using ChristianRent.Domain.Reports;
using ChristianRent.Domain.Review;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Reports;

/// <summary>
/// Files a member's report of a listing and puts it in the review queue, in one unit of work
/// (L2-021, criterion 2). A listing that is not public is answered like one that does not exist,
/// to anyone, and the listing's own poster is refused (criterion 11). A member files one report
/// for each listing: another creates nothing and says when the first was filed (criterion 3).
/// The validator has checked the reason and the note.
/// </summary>
internal sealed class ReportListingCommandHandler(IAppDbContext database, ICurrentMember caller, TimeProvider clock)
    : IRequestHandler<ReportListingCommand, ReportedDto>
{
    public async Task<ReportedDto> Handle(ReportListingCommand command, CancellationToken cancellationToken)
    {
        var reporterId = caller.RequireMember();

        var listing = Guid.TryParse(command.ListingId, out var listingId)
            ? await PublicListings.Of(database).AsNoTracking().FirstOrDefaultAsync(found => found.Id == listingId, cancellationToken)
            : null;
        if (listing is null)
        {
            throw new NotFoundException();
        }

        if (listing.MemberId == reporterId)
        {
            throw new ForbiddenException("own_listing");
        }

        if (await FirstReportedAtAsync(listing.Id, reporterId, cancellationToken) is { } first)
        {
            throw new AlreadyReportedException(first);
        }

        var now = clock.GetUtcNow();
        var note = ReportText.Clean(command.Note);
        var report = Report.File(
            listing, reporterId, ReportWords.ReasonOf(command.Reason)!.Value, note.Length > 0 ? note : null, now);
        database.Reports.Add(report);
        database.ReviewItems.Add(ReviewItem.ForReport(report.Id, now));
        try
        {
            await database.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateException)
        {
            // Another report by this member arrived first, and the unique index refused this
            // one (ADR 0023). Any other failure is passed on.
            if (await FirstReportedAtAsync(listing.Id, reporterId, cancellationToken) is { } other)
            {
                throw new AlreadyReportedException(other);
            }

            throw;
        }

        return new ReportedDto(report.CreatedAt);
    }

    private Task<DateTimeOffset?> FirstReportedAtAsync(Guid listingId, Guid reporterId, CancellationToken cancellationToken) =>
        database.Reports.AsNoTracking()
            .Where(report => report.ListingId == listingId && report.ReporterId == reporterId)
            .Select(report => (DateTimeOffset?)report.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);
}
