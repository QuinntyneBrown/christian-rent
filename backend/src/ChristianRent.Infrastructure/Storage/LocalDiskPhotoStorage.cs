using ChristianRent.Application.Abstractions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace ChristianRent.Infrastructure.Storage;

/// <summary>Photos on local disk, for development (ADR 0004, ADR 0011).</summary>
public sealed class LocalDiskPhotoStorage(IOptions<PhotoStorageOptions> options, IHostEnvironment environment)
    : IPhotoStorage
{
    private readonly string _root = Path.GetFullPath(options.Value.RootPath, environment.ContentRootPath);

    public async Task<bool> IsReachableAsync(CancellationToken cancellationToken)
    {
        try
        {
            Directory.CreateDirectory(_root);
            var probe = Path.Combine(_root, $".probe-{Guid.NewGuid():N}");
            await File.WriteAllBytesAsync(probe, [], cancellationToken);
            File.Delete(probe);
            return true;
        }
        catch (IOException)
        {
            return false;
        }
        catch (UnauthorizedAccessException)
        {
            return false;
        }
    }

    public async Task SaveAsync(string key, Stream content, CancellationToken cancellationToken)
    {
        var path = PathOf(key);
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        await using var file = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None, 81920, useAsync: true);
        await content.CopyToAsync(file, cancellationToken);
    }

    public Task<Stream?> OpenReadAsync(string key, CancellationToken cancellationToken)
    {
        var path = PathOf(key);
        Stream? stream = File.Exists(path)
            ? new FileStream(path, FileMode.Open, FileAccess.Read, FileShare.Read, 81920, useAsync: true)
            : null;
        return Task.FromResult(stream);
    }

    /// <summary>The file a key names, refused when it would leave the storage directory.</summary>
    private string PathOf(string key)
    {
        var path = Path.GetFullPath(Path.Combine(_root, key));
        if (!path.StartsWith(_root + Path.DirectorySeparatorChar, StringComparison.Ordinal))
        {
            throw new ArgumentException("The key leaves the photo storage.", nameof(key));
        }

        return path;
    }
}
