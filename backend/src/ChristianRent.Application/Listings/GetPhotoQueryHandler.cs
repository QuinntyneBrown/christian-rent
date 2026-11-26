using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Listings;

/// <summary>
/// Streams a rendition from file storage, never from the database, when the photo belongs to a
/// public listing (L2-014; ADR 0011). Anything else is <c>not_found</c>, which reveals nothing.
/// The add-photos journey adds the photo's owner and an admin.
/// </summary>
internal sealed class GetPhotoQueryHandler(IAppDbContext database, IPhotoStorage storage) : IRequestHandler<GetPhotoQuery, PhotoFile>
{
    /// <summary>A rendition never changes: a new photo has a new identifier.</summary>
    private const string PublicCacheControl = "public, max-age=31536000, immutable";

    public async Task<PhotoFile> Handle(GetPhotoQuery query, CancellationToken cancellationToken)
    {
        if (!PhotoRenditions.Sizes.ContainsKey(query.Rendition))
        {
            throw new NotFoundException();
        }

        var isPublic = await PublicListings.Of(database)
            .AnyAsync(listing => listing.Photos.Any(photo => photo.PhotoId == query.PhotoId), cancellationToken);
        if (!isPublic)
        {
            throw new NotFoundException();
        }

        var content = await storage.OpenReadAsync(PhotoRenditions.StorageKey(query.PhotoId, query.Rendition), cancellationToken)
            ?? throw new NotFoundException();
        return new PhotoFile(content, "image/jpeg", PublicCacheControl);
    }
}
