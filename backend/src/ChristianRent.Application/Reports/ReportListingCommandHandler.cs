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
/// (L2-021, criterion 2). A listing that is not public is answered like one that does not exist.
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

        var now = clock.GetUtcNow();
        var report = Report.File(listing, reporterId, ReportWords.ReasonOf(command.Reason)!.Value, command.Note, now);
        database.Reports.Add(report);
        database.ReviewItems.Add(ReviewItem.ForReport(report.Id, now));
        await database.SaveChangesAsync(cancellationToken);
        return new ReportedDto(report.CreatedAt);
    }
}
