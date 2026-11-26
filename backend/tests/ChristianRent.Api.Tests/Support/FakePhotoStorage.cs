using ChristianRent.Application.Abstractions;

namespace ChristianRent.Api.Tests.Support;

/// <summary>Photo storage in memory, whose reachability a test sets.</summary>
public sealed class FakePhotoStorage : IPhotoStorage
{
    private readonly Dictionary<string, byte[]> _files = new(StringComparer.Ordinal);

    public bool Reachable { get; set; } = true;

    public Task<bool> IsReachableAsync(CancellationToken cancellationToken) => Task.FromResult(Reachable);

    public async Task SaveAsync(string key, Stream content, CancellationToken cancellationToken)
    {
        using var buffer = new MemoryStream();
        await content.CopyToAsync(buffer, cancellationToken);
        lock (_files)
        {
            _files[key] = buffer.ToArray();
        }
    }

    public Task<Stream?> OpenReadAsync(string key, CancellationToken cancellationToken)
    {
        lock (_files)
        {
            return Task.FromResult<Stream?>(_files.TryGetValue(key, out var bytes) ? new MemoryStream(bytes, writable: false) : null);
        }
    }

    public Task DeleteAsync(string key, CancellationToken cancellationToken)
    {
        lock (_files)
        {
            _files.Remove(key);
        }

        return Task.CompletedTask;
    }

    public void Put(string key, byte[] bytes)
    {
        lock (_files)
        {
            _files[key] = bytes;
        }
    }
}
