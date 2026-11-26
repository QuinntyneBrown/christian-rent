namespace ChristianRent.Domain.Listings;

/// <summary>
/// A photo of a listing for rent, in the order the member chose; the first is the card's
/// (L2-001, criterion 3). The bytes are in file storage, never here (ADR 0011).
/// <see cref="Description"/> is the photo's text alternative; who writes it is an open decision.
/// </summary>
public sealed class ListingPhoto
{
    public const int MaxDescriptionLength = 200;

    private ListingPhoto(Guid photoId, int position, string? description)
    {
        PhotoId = photoId;
        Position = position;
        Description = description;
    }

    public Guid PhotoId { get; private set; }

    public int Position { get; private set; }

    public string? Description { get; private set; }

    public static ListingPhoto Create(Guid photoId, int position, string? description) =>
        new(photoId, position, description);
}
