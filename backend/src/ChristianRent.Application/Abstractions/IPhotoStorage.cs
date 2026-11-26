namespace ChristianRent.Application.Abstractions;

/// <summary>
/// Where photo renditions are kept, apart from the database (ADR 0004, ADR 0011). A key is
/// <c>{photoId:N}/{rendition}.jpg</c>. The add-photos journey adds deleting.
/// </summary>
public interface IPhotoStorage
{
    /// <summary>Whether the storage can be reached and written, for the readiness check.</summary>
    Task<bool> IsReachableAsync(CancellationToken cancellationToken);

    /// <summary>Writes the content under the key, replacing what was there.</summary>
    Task SaveAsync(string key, Stream content, CancellationToken cancellationToken);

    /// <summary>Opens what the key holds for reading, or answers null when it holds nothing.</summary>
    Task<Stream?> OpenReadAsync(string key, CancellationToken cancellationToken);
}
