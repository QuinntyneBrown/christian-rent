using ChristianRent.Application;
using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Members;
using ChristianRent.Infrastructure.Identity;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Cli.Tests;

/// <summary>
/// L2-028 criterion 1, L2-027 criterion 4 and ADR 0029: the operator creates an account with
/// <c>create-account &lt;email&gt; [&lt;member-id&gt;]</c>, reading the password from standard input.
/// It is safe to run again. The database is EF Core InMemory.
/// </summary>
public sealed class CreateAccountTests : IDisposable
{
    private const string Email = "naomi.friesen@example.ca";
    private const string Password = "correct horse battery staple";
    private static readonly DateTimeOffset Joined = new(2026, 1, 5, 9, 0, 0, TimeSpan.Zero);

    private readonly StringWriter _output = new();
    private readonly ServiceProvider _services;
    private readonly Church _grace = Church.Create(Guid.NewGuid(), "Grace Community Church", "Langley", isVerified: true);
    private readonly Member _naomi;
    private readonly Member _linked;
    private readonly Member _gone;

    public CreateAccountTests()
    {
        _naomi = Member.Create(Guid.NewGuid(), "Naomi Friesen", _grace.Id, isVerified: true, Joined);
        _linked = Member.Create(Guid.NewGuid(), "Linked Member", _grace.Id, isVerified: true, Joined, "another-account");
        _gone = Member.Create(Guid.NewGuid(), "Gone Member", _grace.Id, isVerified: true, Joined);
        _gone.Depart(Joined.AddDays(1));
        var databaseName = $"christian-rent-accounts-{Guid.NewGuid()}";
        _services = new ServiceCollection()
            .AddLogging()
            .AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(databaseName))
            .AddScoped<Application.Abstractions.IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>())
            .AddSingleton(TimeProvider.System)
            .AddApplication()
            .AddAccounts()
            .BuildServiceProvider();
    }

    public void Dispose()
    {
        _services.Dispose();
        _output.Dispose();
    }

    [Fact]
    [Trait("Category", "Critical")]
    public async Task Create_account_stores_a_hash_of_the_password_from_standard_input_and_links_the_member()
    {
        await SeedAsync();

        var exitCode = await RunAsync(Password, "create-account", Email, _naomi.Id.ToString());

        Assert.Equal(0, exitCode);
        var account = await AccountAsync();
        Assert.NotNull(account);
        Assert.NotEqual(Password, account.PasswordHash);
        Assert.DoesNotContain(Password, account.PasswordHash ?? "", StringComparison.Ordinal);
        Assert.Equal(account.Id, (await MemberAsync(_naomi.Id)).SignInId);
        // What the command writes names nobody and holds no password or email (L2-028, criterion 3).
        Assert.DoesNotContain(Password, _output.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain(Email, _output.ToString(), StringComparison.Ordinal);
        Assert.DoesNotContain("Naomi", _output.ToString(), StringComparison.Ordinal);
        using var scope = _services.CreateScope();
        var users = scope.ServiceProvider.GetRequiredService<UserManager<Account>>();
        Assert.True(await users.CheckPasswordAsync(account, Password));
    }

    [Fact]
    public async Task Create_account_without_a_member_makes_an_account_that_can_join()
    {
        var exitCode = await RunAsync(Password, "create-account", Email);

        Assert.Equal(0, exitCode);
        Assert.NotNull(await AccountAsync());
        Assert.Contains("Created the account", _output.ToString(), StringComparison.Ordinal);
    }

    [Fact]
    public async Task Running_create_account_again_changes_nothing_and_keeps_the_first_password()
    {
        await SeedAsync();
        await RunAsync(Password, "create-account", Email, _naomi.Id.ToString());
        var first = await AccountAsync();

        var exitCode = await RunAsync("a different password entirely", "create-account", Email, _naomi.Id.ToString());

        Assert.Equal(0, exitCode);
        var again = await AccountAsync();
        Assert.Equal(first!.Id, again!.Id);
        Assert.Equal(first.PasswordHash, again.PasswordHash);
        Assert.Contains("The account exists; its password is unchanged.", _output.ToString(), StringComparison.Ordinal);
    }

    // One case per row: what create-account refuses, creating nothing.
    [Theory]
    [InlineData("short password", "too short")]
    [InlineData("departed member", Password)]
    [InlineData("unknown member", Password)]
    [InlineData("member with another account", Password)]
    [InlineData("not an email", Password)]
    [InlineData("no password", "")]
    public async Task Create_account_refuses(string refusal, string password)
    {
        await SeedAsync();
        var (email, member) = refusal switch
        {
            "departed member" => (Email, _gone.Id.ToString()),
            "unknown member" => (Email, Guid.NewGuid().ToString()),
            "member with another account" => (Email, _linked.Id.ToString()),
            "not an email" => ("naomi", _naomi.Id.ToString()),
            _ => (Email, _naomi.Id.ToString()),
        };

        var exitCode = await RunAsync(password, "create-account", email, member);

        Assert.Equal(1, exitCode);
        using var scope = _services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False(await database.Users.AnyAsync(TestContext.Current.CancellationToken));
        Assert.Null((await MemberAsync(_naomi.Id)).SignInId);
        Assert.DoesNotContain(password.Length > 0 ? password : "\u0000", _output.ToString(), StringComparison.Ordinal);
    }

    private Task<int> RunAsync(string password, params string[] args) =>
        CliApp.RunAsync(args, _services, new StringReader(password + "\n"), _output, TestContext.Current.CancellationToken);

    private async Task SeedAsync()
    {
        using var scope = _services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        database.AddRange(_grace, _naomi, _linked, _gone);
        await database.SaveChangesAsync(TestContext.Current.CancellationToken);
    }

    private async Task<Account?> AccountAsync()
    {
        using var scope = _services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await database.Users.AsNoTracking().SingleOrDefaultAsync(TestContext.Current.CancellationToken);
    }

    private async Task<Member> MemberAsync(Guid id)
    {
        using var scope = _services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await database.Members.AsNoTracking().SingleAsync(member => member.Id == id, TestContext.Current.CancellationToken);
    }
}
