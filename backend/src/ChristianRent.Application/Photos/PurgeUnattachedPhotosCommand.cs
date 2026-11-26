using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Listings;
using ChristianRent.Domain.Listings;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Photos;

/// <summary>
/// Deletes every photo no posted listing names once it is <see cref="PhotoRules.KeepUnattached"/>
/// old (L2-014, criterion 7; ADR 0021). Run hourly by <c>ChristianRent.Cli purge-photos</c>;
/// running it again changes nothing. Answers how many photos were deleted.
/// </summary>
public sealed record PurgeUnattachedPhotosCommand : IRequest<int>;

internal sealed class PurgeUnattachedPhotosCommandHandler(IAppDbContext database, IPhotoStorage storage, TimeProvider clock)
    : IRequestHandler<PurgeUnattachedPhotosCommand, int>
{
    public async Task<int> Handle(PurgeUnattachedPhotosCommand command, CancellationToken cancellationToken)
    {
        var uploadedBy = clock.GetUtcNow() - PhotoRules.KeepUnattached;
        var photos = await database.Photos
            .Where(photo => photo.ListingId == null && photo.UploadedAt <= uploadedBy)
            .ToListAsync(cancellationToken);

        // The files go first: a row left behind is deleted on the next run, a file never would be.
        foreach (var photo in photos)
        {
            foreach (var rendition in PhotoRenditions.Sizes.Keys)
            {
                await storage.DeleteAsync(PhotoRenditions.StorageKey(photo.Id, rendition), cancellationToken);
            }
        }

        database.Photos.RemoveRange(photos);
        await database.SaveChangesAsync(cancellationToken);
        return photos.Count;
    }
}
