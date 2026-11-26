using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using ChristianRent.Application.Listings;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Photos;

/// <summary>
/// A member deletes their own photo that no listing names, as Post does when a photo is removed
/// (add-photos design; L2-014, criterion 8).
/// </summary>
public sealed record DeletePhotoCommand(Guid PhotoId) : IRequest;

/// <summary>
/// Deletes the photo's renditions, then its row. Another member's photo, one a listing names
/// and one that does not exist are all <c>not_found</c> (L2-025, criterion 2).
/// </summary>
internal sealed class DeletePhotoCommandHandler(IAppDbContext database, ICurrentMember caller, IPhotoStorage storage)
    : IRequestHandler<DeletePhotoCommand>
{
    public async Task Handle(DeletePhotoCommand command, CancellationToken cancellationToken)
    {
        var memberId = caller.RequireMember();
        var photo = await database.Photos
            .FirstOrDefaultAsync(photo => photo.Id == command.PhotoId && photo.OwnerId == memberId && photo.ListingId == null, cancellationToken)
            ?? throw new NotFoundException();

        foreach (var rendition in PhotoRenditions.Sizes.Keys)
        {
            await storage.DeleteAsync(PhotoRenditions.StorageKey(photo.Id, rendition), cancellationToken);
        }

        database.Photos.Remove(photo);
        await database.SaveChangesAsync(cancellationToken);
    }
}
