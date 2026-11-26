using ChristianRent.Application.Abstractions;

namespace ChristianRent.Api.Tests.Support;

/// <summary>Photo storage whose reachability a test sets.</summary>
public sealed class FakePhotoStorage : IPhotoStorage
{
    public bool Reachable { get; set; } = true;

    public Task<bool> IsReachableAsync(CancellationToken cancellationToken) => Task.FromResult(Reachable);
}
