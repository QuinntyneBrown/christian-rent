namespace ChristianRent.Application.Abstractions;

/// <summary>
/// Where photos are kept (ADR 0004). The add-photos journey adds saving, reading and deleting.
/// </summary>
public interface IPhotoStorage
{
    /// <summary>Whether the storage can be reached and written, for the readiness check.</summary>
    Task<bool> IsReachableAsync(CancellationToken cancellationToken);
}
