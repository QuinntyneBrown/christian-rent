using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Listings;
using ChristianRent.Domain.Listings;
using FluentValidation;
using FluentValidation.Results;
using MediatR;

namespace ChristianRent.Application.Photos;

/// <summary>
/// Stores a member's photo (add-photos design; ADR 0021): it refuses one over 10 MB before
/// reading it, identifies the content and refuses it by <see cref="PhotoRules"/>, has it
/// re-encoded as the renditions without metadata, writes each to file storage, and saves a
/// <see cref="Photo"/> row that holds no image bytes (L2-014, criteria 3 and 4).
/// </summary>
internal sealed class UploadPhotoCommandHandler(
    IAppDbContext database,
    ICurrentMember caller,
    IPhotoInspector inspector,
    IPhotoProcessor processor,
    IPhotoStorage storage,
    TimeProvider clock) : IRequestHandler<UploadPhotoCommand, UploadedPhotoDto>
{
    public async Task<UploadedPhotoDto> Handle(UploadPhotoCommand command, CancellationToken cancellationToken)
    {
        var memberId = caller.RequireMember();
        Refuse(PhotoRules.CheckLength(command.Length));

        var content = new byte[command.Length];
        await command.Content.ReadExactlyAsync(content, cancellationToken);
        var facts = inspector.Inspect(content);
        Refuse(PhotoRules.Check(command.Length, facts));

        var id = Guid.NewGuid();
        foreach (var rendition in await processor.ProcessAsync(content, cancellationToken))
        {
            using var stream = new MemoryStream(rendition.Content, writable: false);
            await storage.SaveAsync(PhotoRenditions.StorageKey(id, rendition.Name), stream, cancellationToken);
        }

        database.Photos.Add(Photo.Upload(id, memberId, facts!.Width, facts.Height, clock.GetUtcNow()));
        await database.SaveChangesAsync(cancellationToken);
        return UploadedPhotoDto.Of(id);
    }

    /// <summary>A refusal is answered 400 with the rule's code (ADR 0021).</summary>
    private static void Refuse(string? code)
    {
        if (code is not null)
        {
            throw new ValidationException([new ValidationFailure("file", RefusalMessage) { ErrorCode = code }]);
        }
    }

    public const string RefusalMessage =
        "A photo must be a JPEG, PNG or WebP of 10 MB or less, at least 400 × 300 px and at most 8,000 px on a side.";
}
