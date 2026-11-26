using ChristianRent.Application.Abstractions;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace ChristianRent.Infrastructure.Storage;

/// <summary>Photos on local disk, for development (ADR 0004).</summary>
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
}
