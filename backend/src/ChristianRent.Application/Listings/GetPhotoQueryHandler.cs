using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using ChristianRent.Domain.Listings;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Listings;

/// <summary>
/// Streams a rendition from file storage, never from the database (L2-014, criterion 4; ADR 0011,
/// ADR 0021). A photo a listing names is served as the listing is seen (<see cref="ListingVisibility"/>):
/// to anyone, cached for a year, once the listing is public; otherwise privately to its poster
/// and to an admin (criterion 5). A photo no listing names is served privately to its uploader
/// alone (criterion 8). Anything else is <c>not_found</c>, which reveals nothing.
/// </summary>
internal sealed class GetPhotoQueryHandler(IAppDbContext database, IPhotoStorage storage, ICurrentMember caller)
    : IRequestHandler<GetPhotoQuery, PhotoFile>
{
    /// <summary>A rendition never changes: a new photo has a new identifier.</summary>
    private const string PublicCacheControl = "public, max-age=31536000, immutable";

    /// <summary>What only some may see is never kept by a shared cache or the browser.</summary>
    private const string PrivateCacheControl = "private, no-store";

    public async Task<PhotoFile> Handle(GetPhotoQuery query, CancellationToken cancellationToken)
    {
        if (!PhotoRenditions.Sizes.ContainsKey(query.Rendition))
        {
            throw new NotFoundException();
        }

        var cacheControl = await CacheControlForAsync(query.PhotoId, cancellationToken) ?? throw new NotFoundException();
        var content = await storage.OpenReadAsync(PhotoRenditions.StorageKey(query.PhotoId, query.Rendition), cancellationToken)
            ?? throw new NotFoundException();
        return new PhotoFile(content, "image/jpeg", cacheControl);
    }

    /// <summary>How the photo is served to this caller, or null when it is not theirs to see.</summary>
    private async Task<string?> CacheControlForAsync(Guid photoId, CancellationToken cancellationToken)
    {
        var named = await database.Listings.AsNoTracking()
            .Where(listing => listing.Photos.Any(photo => photo.PhotoId == photoId))
            .Join(database.Members, listing => listing.MemberId, member => member.Id, (listing, member) => new { Listing = listing, member.Status })
            .FirstOrDefaultAsync(cancellationToken);
        if (named is not null)
        {
            if (ListingVisibility.CanBeSeenBy(named.Listing, named.Status, callerId: null, callerIsAdmin: false))
            {
                return PublicCacheControl;
            }

            return ListingVisibility.CanBeSeenBy(named.Listing, named.Status, caller.MemberId, caller.IsAdmin) ? PrivateCacheControl : null;
        }

        var ownUnattached = caller.MemberId is { } memberId && await database.Photos.AsNoTracking()
            .AnyAsync(photo => photo.Id == photoId && photo.OwnerId == memberId && photo.ListingId == null, cancellationToken);
        return ownUnattached ? PrivateCacheControl : null;
    }
}
