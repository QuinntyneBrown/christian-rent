using ChristianRent.Application.Listings;
using MediatR;

namespace ChristianRent.Application.Photos;

/// <summary>
/// A member uploads a photo (add-photos design). The file name and the declared content type
/// are not part of it: the content alone says what it is (L2-014, criterion 1).
/// </summary>
public sealed record UploadPhotoCommand(Stream Content, long Length) : IRequest<UploadedPhotoDto>;

/// <summary>An uploaded photo: its identifier and the addresses of its renditions.</summary>
public sealed record UploadedPhotoDto(Guid Id, PhotoUrlsDto Urls)
{
    public static UploadedPhotoDto Of(Guid id) => new(
        id,
        new PhotoUrlsDto(
            PhotoRenditions.Url(id, PhotoRenditions.Card),
            PhotoRenditions.Url(id, PhotoRenditions.Gallery),
            PhotoRenditions.Url(id, PhotoRenditions.Thumb)));
}

public sealed record PhotoUrlsDto(string Card, string Gallery, string Thumb);
