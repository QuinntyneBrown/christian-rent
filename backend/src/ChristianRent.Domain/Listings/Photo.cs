namespace ChristianRent.Domain.Listings;

/// <summary>
/// A photo a member uploaded (add-photos design; ADR 0021). Its renditions are in file storage
/// under keys that follow from <see cref="Id"/>, never here (ADR 0011). Until a posted listing
/// names it, it is its uploader's alone, and it is deleted once it is 24 hours old.
/// </summary>
public sealed class Photo
{
    private Photo(Guid id, Guid ownerId, int width, int height, DateTimeOffset uploadedAt)
    {
        Id = id;
        OwnerId = ownerId;
        Width = width;
        Height = height;
        UploadedAt = uploadedAt;
    }

    public Guid Id { get; private set; }

    /// <summary>The member who uploaded it.</summary>
    public Guid OwnerId { get; private set; }

    /// <summary>The listing that names it, once one is posted; null until then.</summary>
    public Guid? ListingId { get; private set; }

    /// <summary>The uploaded image's width and height, in pixels.</summary>
    public int Width { get; private set; }

    public int Height { get; private set; }

    public DateTimeOffset UploadedAt { get; private set; }

    public static Photo Upload(Guid id, Guid ownerId, int width, int height, DateTimeOffset uploadedAt) =>
        new(id, ownerId, width, height, uploadedAt);

    /// <summary>A posted listing names the photo; it stops being unattached.</summary>
    public void AttachTo(Guid listingId) => ListingId = listingId;
}
