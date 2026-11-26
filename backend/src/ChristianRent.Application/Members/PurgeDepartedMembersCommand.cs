using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Listings;
using ChristianRent.Domain.Members;
using FluentValidation;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Members;

/// <summary>
/// Makes every member who left at least <see cref="AfterDays"/> days ago anonymous, and deletes
/// their listings and photo files (L2-028, criterion 2; handle-member-data design). The text of
/// the messages they sent is cleared, and the messages about their listings are deleted. Run daily by
/// <c>ChristianRent.Cli purge-departed</c>; running it again changes nothing.
/// </summary>
public sealed record PurgeDepartedMembersCommand(int AfterDays) : IRequest<PurgeResult>;

/// <summary>How many members were made anonymous, and how many listings and photos went with them.</summary>
public sealed record PurgeResult(int Members, int Listings, int Photos);

public sealed class PurgeDepartedMembersCommandValidator : AbstractValidator<PurgeDepartedMembersCommand>
{
    public PurgeDepartedMembersCommandValidator()
    {
        RuleFor(command => command.AfterDays)
            .InclusiveBetween(0, MemberPurgeOptions.MaxDays)
            .WithMessage($"{MemberPurgeOptions.Section}:{nameof(MemberPurgeOptions.PurgeAfterDays)} must be 0 to {MemberPurgeOptions.MaxDays} days.");
    }
}

internal sealed class PurgeDepartedMembersCommandHandler(IAppDbContext database, IPhotoStorage photos, TimeProvider clock)
    : IRequestHandler<PurgeDepartedMembersCommand, PurgeResult>
{
    public async Task<PurgeResult> Handle(PurgeDepartedMembersCommand command, CancellationToken cancellationToken)
    {
        var now = clock.GetUtcNow();
        var leftBy = now.AddDays(-command.AfterDays);
        var departed = await database.Members
            .Where(member => member.Status == MemberStatus.Departed && member.AnonymizedAt == null && member.DepartedAt <= leftBy)
            .ToListAsync(cancellationToken);
        var ids = departed.Select(member => member.Id).ToList();
        var listings = await database.Listings.Where(listing => ids.Contains(listing.MemberId)).ToListAsync(cancellationToken);

        var photoCount = 0;
        foreach (var photo in listings.SelectMany(listing => listing.Photos))
        {
            foreach (var rendition in PhotoRenditions.Sizes.Keys)
            {
                await photos.DeleteAsync(PhotoRenditions.StorageKey(photo.PhotoId, rendition), cancellationToken);
            }

            photoCount++;
        }

        // What the member wrote goes; the messages about their listings go with the listings
        // (L2-016, criterion 7; ADR 0022).
        var listingIds = listings.Select(listing => listing.Id).ToList();
        var messages = await database.Messages
            .Where(message => ids.Contains(message.SenderId) || listingIds.Contains(message.ListingId))
            .ToListAsync(cancellationToken);
        foreach (var message in messages)
        {
            if (listingIds.Contains(message.ListingId))
            {
                database.Messages.Remove(message);
            }
            else
            {
                message.ClearText();
            }
        }

        database.Listings.RemoveRange(listings);
        foreach (var member in departed)
        {
            member.Anonymize(now);
        }

        await database.SaveChangesAsync(cancellationToken);
        return new PurgeResult(departed.Count, listings.Count, photoCount);
    }
}
