using ChristianRent.Application.Abstractions;

namespace ChristianRent.Cli.Tests;

/// <summary>Photo storage in memory, so the seed writes no file.</summary>
public sealed class MemoryPhotoStorage : IPhotoStorage
{
    public Dictionary<string, byte[]> Files { get; } = new(StringComparer.Ordinal);

    public int Saves { get; private set; }

    public Task<bool> IsReachableAsync(CancellationToken cancellationToken) => Task.FromResult(true);

    public async Task SaveAsync(string key, Stream content, CancellationToken cancellationToken)
    {
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, cancellationToken);
        Files[key] = buffer.ToArray();
        Saves++;
    }

    public Task<Stream?> OpenReadAsync(string key, CancellationToken cancellationToken) =>
        Task.FromResult<Stream?>(Files.TryGetValue(key, out var bytes) ? new MemoryStream(bytes) : null);
}
