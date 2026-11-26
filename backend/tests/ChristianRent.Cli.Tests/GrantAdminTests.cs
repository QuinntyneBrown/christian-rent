using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Members;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Cli.Tests;

/// <summary>
/// ADR 0024: an operator makes an admin with <c>grant-admin</c>, by the member's sign-in
/// identifier; run again it changes nothing, and an identifier that names no active member
/// changes nothing and fails. The database is EF Core InMemory.
/// </summary>
public sealed class GrantAdminTests : IDisposable
{
    private static readonly Church Grace = Church.Create(Guid.NewGuid(), "Grace Community Church", "Langley", isVerified: true);

    private readonly ServiceProvider _services;
    private readonly StringWriter _output = new();

    public GrantAdminTests()
    {
        var databaseName = $"christian-rent-cli-{Guid.NewGuid()}";
        _services = new ServiceCollection()
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(databaseName))
            .BuildServiceProvider();
    }

    public void Dispose()
    {
        _services.Dispose();
        _output.Dispose();
    }

    [Fact]
    public async Task Grant_admin_makes_the_member_an_admin_once()
    {
        var naomi = Member.Create(Guid.NewGuid(), "Naomi Friesen", Grace.Id, isVerified: true, DateTimeOffset.UnixEpoch, "naomi-friesen");
        var dan = Member.Create(Guid.NewGuid(), "Pastor Dan Whitaker", Grace.Id, isVerified: true, DateTimeOffset.UnixEpoch, "dan-whitaker");
        await SeedAsync(Grace, naomi, dan);

        var first = await CliApp.RunAsync(["grant-admin", "naomi-friesen"], _services, _output, TestContext.Current.CancellationToken);
        var again = await CliApp.RunAsync(["grant-admin", "naomi-friesen"], _services, _output, TestContext.Current.CancellationToken);

        Assert.Equal(0, first);
        Assert.Equal(0, again);
        var admins = await AdminsAsync();
        Assert.Equal(["Naomi Friesen"], admins);
        Assert.Contains("Naomi Friesen is an admin.", _output.ToString(), StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("nobody")]
    [InlineData("departed")]
    public async Task Grant_admin_refuses_anyone_who_is_not_an_active_member(string signInId)
    {
        var departed = Member.Create(Guid.NewGuid(), "Former member", Grace.Id, isVerified: true, DateTimeOffset.UnixEpoch, "departed");
        departed.Remove();
        await SeedAsync(Grace, departed);

        var exitCode = await CliApp.RunAsync(["grant-admin", signInId], _services, _output, TestContext.Current.CancellationToken);

        Assert.Equal(1, exitCode);
        Assert.Empty(await AdminsAsync());
        Assert.Contains("No active member signs in as", _output.ToString(), StringComparison.Ordinal);
    }

    private async Task SeedAsync(params object[] rows)
    {
        using var scope = _services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        database.AddRange(rows);
        await database.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    private async Task<List<string>> AdminsAsync()
    {
        using var scope = _services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Members.AsNoTracking()
            .Where(member => member.IsAdmin)
            .Select(member => member.Name)
            .ToListAsync(TestContext.Current.CancellationToken);
    }
}
