using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using ChristianRent.Application.Members;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Review;
using FluentValidation;
using FluentValidation.Results;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Listings;

/// <summary>
/// Saves a member's listing as waiting for review and puts it in the review queue, in one unit
/// of work (L2-012, criterion 1). A client request already posted answers that listing
/// (criterion 4); a member who has posted 10 in 24 hours is refused until
/// <see cref="PostingLimit"/> reopens (criterion 6). The validator has checked every field.
/// </summary>
internal sealed class PostListingCommandHandler(IAppDbContext database, ICurrentMember caller, TimeProvider clock)
    : IRequestHandler<PostListingCommand, PostListingResult>
{
    public async Task<PostListingResult> Handle(PostListingCommand command, CancellationToken cancellationToken)
    {
        var memberId = caller.RequireMember();
        var requestId = command.ClientRequestId!.Value;

        var existing = await database.Listings.AsNoTracking()
            .FirstOrDefaultAsync(listing => listing.MemberId == memberId && listing.ClientRequestId == requestId, cancellationToken);
        if (existing is not null)
        {
            return new PostListingResult(ToDto(existing), Created: false);
        }

        var now = clock.GetUtcNow();
        var since = now - PostingLimit.Window;
        var recent = await database.Listings.AsNoTracking()
            .Where(listing => listing.MemberId == memberId && listing.CreatedAt > since)
            .Select(listing => listing.CreatedAt)
            .ToListAsync(cancellationToken);
        if (PostingLimit.RetryAt(recent, now) is { } retryAt)
        {
            throw new LimitReachedException("post_limit_reached", retryAt);
        }

        // Until journey 7 stores uploads, no photo is the member's own, so any is refused (ADR 0019).
        if (command.PhotoIds is { Count: > 0 })
        {
            throw new ValidationException([new ValidationFailure(nameof(PostListingCommand.PhotoIds), PhotoNotFoundMessage)]);
        }

        var offer = ListingWords.OfferOf(command.Offer)!.Value;
        var price = command.PriceAmount is { } amount ? new Price(amount, ListingWords.PeriodOf(command.PricePeriod)!.Value) : null;
        var whenText = MemberText.Clean(command.WhenText);
        var note = command.Note?.Trim();

        var listing = Listing.Post(
            memberId,
            requestId,
            offer,
            ListingWords.KindOf(command.Kind)!.Value,
            MemberText.Clean(command.Title),
            price,
            whenText.Length > 0 ? whenText : null,
            whenText.Length > 0 ? null : command.StartDate,
            whenText.Length > 0 ? null : command.EndDate,
            MemberText.Clean(command.Area),
            string.IsNullOrEmpty(note) ? null : note,
            now);
        database.Listings.Add(listing);
        database.ReviewItems.Add(ReviewItem.ForNewListing(listing.Id, now));
        await database.SaveChangesAsync(cancellationToken);
        return new PostListingResult(ToDto(listing), Created: true);
    }

    public const string PhotoNotFoundMessage = "A photo was not found. Add it again.";

    private static PostedListingDto ToDto(Listing listing) => new(listing.Id, ListingWords.Of(listing.Status));
}
