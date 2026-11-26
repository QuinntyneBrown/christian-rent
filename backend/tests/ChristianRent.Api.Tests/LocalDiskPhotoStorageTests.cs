using ChristianRent.Infrastructure.Storage;
using Microsoft.Extensions.FileProviders;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;

namespace ChristianRent.Api.Tests;

/// <summary>ADR 0011: renditions on local disk, under the storage directory and nowhere else.</summary>
public sealed class LocalDiskPhotoStorageTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), $"christian-rent-photos-{Guid.NewGuid():N}");
    private readonly LocalDiskPhotoStorage _storage;

    public LocalDiskPhotoStorageTests()
    {
        _storage = new LocalDiskPhotoStorage(
            Options.Create(new PhotoStorageOptions { RootPath = _root }),
            new Environment(_root));
    }

    public void Dispose()
    {
        if (Directory.Exists(_root))
        {
            Directory.Delete(_root, recursive: true);
        }
    }

    [Fact]
    public async Task A_saved_rendition_reads_back_and_a_missing_one_is_null()
    {
        var key = $"{Guid.NewGuid():N}/card.jpg";
        using (var content = new MemoryStream([1, 2, 3]))
        {
            await _storage.SaveAsync(key, content, TestContext.Current.CancellationToken);
        }

        await using var read = await _storage.OpenReadAsync(key, TestContext.Current.CancellationToken);
        using var copy = new MemoryStream();
        await read!.CopyToAsync(copy, TestContext.Current.CancellationToken);

        Assert.Equal([1, 2, 3], copy.ToArray());
        Assert.Null(await _storage.OpenReadAsync($"{Guid.NewGuid():N}/card.jpg", TestContext.Current.CancellationToken));
    }

    [Theory]
    [InlineData("../outside.jpg")]
    [InlineData("/etc/passwd")]
    public async Task A_key_that_leaves_the_storage_directory_is_refused(string key)
    {
        await Assert.ThrowsAsync<ArgumentException>(() => _storage.OpenReadAsync(key, TestContext.Current.CancellationToken));
    }

    private sealed class Environment(string root) : IHostEnvironment
    {
        public string EnvironmentName { get; set; } = "Testing";

        public string ApplicationName { get; set; } = "ChristianRent.Api.Tests";

        public string ContentRootPath { get; set; } = root;

        public IFileProvider ContentRootFileProvider { get; set; } = new NullFileProvider();
    }
}
