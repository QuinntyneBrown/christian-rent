using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Listings;
using ChristianRent.Domain.Listings;
using MediatR;

namespace ChristianRent.Application.Photos;

/// <summary>
/// Stores a member's photo (add-photos design; ADR 0021): it identifies the content, has it
/// re-encoded as the renditions without metadata, writes each to file storage, and saves a
/// <see cref="Photo"/> row that holds no image bytes (L2-014, criteria 3 and 4).
/// </summary>
internal sealed class UploadPhotoCommandHandler(
    IAppDbContext database,
    ICurrentMember caller,
    IPhotoInspector inspector,
    IPhotoProcessor processor,
    IPhotoStorage storage,
    TimeProvider clock) : IRequestHandler<UploadPhotoCommand, PhotoRefDto>
{
    public async Task<PhotoRefDto> Handle(UploadPhotoCommand command, CancellationToken cancellationToken)
    {
        var memberId = caller.RequireMember();

        var content = new byte[command.Length];
        await command.Content.ReadExactlyAsync(content, cancellationToken);
        var facts = inspector.Inspect(content)!;

        var id = Guid.NewGuid();
        foreach (var rendition in await processor.ProcessAsync(content, cancellationToken))
        {
            using var stream = new MemoryStream(rendition.Content, writable: false);
            await storage.SaveAsync(PhotoRenditions.StorageKey(id, rendition.Name), stream, cancellationToken);
        }

        database.Photos.Add(Photo.Upload(id, memberId, facts.Width, facts.Height, clock.GetUtcNow()));
        await database.SaveChangesAsync(cancellationToken);
        return PhotoRefDto.Of(id);
    }
}
