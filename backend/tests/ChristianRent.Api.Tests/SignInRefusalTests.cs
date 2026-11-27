using System.Net;
using System.Net.Http.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

/// <summary>
/// L2-037 criteria 2 and 3, L2-018 criterion 4 and L2-040 criteria 4 and 5 (ADR 0029): one
/// refusal that reveals nothing, the lockout on a fake clock, and the removed or departed member,
/// through the real cookie flow.
/// </summary>
public sealed class SignInRefusalTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly Domain.Churches.Church Grace = TestData.Grace;

    [Fact]
    public async Task An_email_with_no_account_is_refused_exactly_as_a_wrong_password()
    {
        await Accounts.CreateAsync(factory, "known@example.ca");
        StartAFreshWindow();
        using var client = Accounts.Browser(factory);

        using var unknown = await SignInAsync(client, "nobody@example.ca", Accounts.Password);
        using var wrong = await SignInAsync(client, "known@example.ca", "not the password at all");

        Assert.Equal(HttpStatusCode.Unauthorized, unknown.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, wrong.StatusCode);
        var (unknownProblem, wrongProblem) = (await Problem.ReadAsync(unknown), await Problem.ReadAsync(wrong));
        Assert.Equal("sign_in_failed", unknownProblem.Code);
        Assert.Equal((unknownProblem.Code, unknownProblem.Title), (wrongProblem.Code, wrongProblem.Title));
    }

    [Fact]
    public async Task Five_refusals_in_a_row_lock_the_account_for_15_minutes_even_for_the_right_password()
    {
        await Accounts.CreateAsync(factory, "locked@example.ca");
        StartAFreshWindow();
        using var client = Accounts.Browser(factory);
        for (var attempt = 0; attempt < SignInLockout.MaxFailures; attempt++)
        {
            using var refused = await SignInAsync(client, "locked@example.ca", "not the password at all");
        }

        using var whileLocked = await SignInAsync(client, "locked@example.ca", Accounts.Password);
        factory.Clock.Advance(TimeSpan.FromMinutes(15));
        using var afterwards = await SignInAsync(client, "locked@example.ca", Accounts.Password);

        Assert.Equal(HttpStatusCode.Unauthorized, whileLocked.StatusCode);
        Assert.Equal("sign_in_failed", (await Problem.ReadAsync(whileLocked)).Code);
        Assert.Equal(HttpStatusCode.NoContent, afterwards.StatusCode);
    }

    [Fact]
    public async Task A_sign_in_sets_the_count_back_to_zero()
    {
        await Accounts.CreateAsync(factory, "careless@example.ca");
        StartAFreshWindow();
        using var client = Accounts.Browser(factory);

        await FailAsync(client, "careless@example.ca", SignInLockout.MaxFailures - 1);
        using var first = await SignInAsync(client, "careless@example.ca", Accounts.Password);
        await FailAsync(client, "careless@example.ca", SignInLockout.MaxFailures - 1);
        using var second = await SignInAsync(client, "careless@example.ca", Accounts.Password);

        Assert.Equal(HttpStatusCode.NoContent, first.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
    }

    // L2-018 criterion 4; L2-040 criterion 4.
    [Fact]
    public async Task A_removed_member_is_signed_out_at_their_next_request_and_cannot_sign_in_again()
    {
        var sam = TestData.Member("Sam Removed", Grace);
        await Accounts.CreateAsync(factory, "sam@example.ca", sam.Id, sam);
        StartAFreshWindow();
        using var client = await Accounts.SignInAsync(factory, "sam@example.ca");

        await ChangeMemberAsync(sam.Id, member => member.Remove());
        using var me = await client.GetAsync("/api/members/me", TestContext.Current.CancellationToken);
        using var again = await SignInAsync(Accounts.Browser(factory), "sam@example.ca", Accounts.Password);

        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, again.StatusCode);
        Assert.Equal("sign_in_failed", (await Problem.ReadAsync(again)).Code);
    }

    // L2-040 criterion 5; ADR 0017: leaving ends every session, and the account may join again.
    [Fact]
    public async Task A_member_who_leaves_is_signed_out_everywhere_and_may_sign_in_and_join_again()
    {
        var dana = TestData.Member("Dana Leaving", Grace);
        await Accounts.CreateAsync(factory, "dana@example.ca", dana.Id, Grace, dana);
        StartAFreshWindow();
        using var here = await Accounts.SignInAsync(factory, "dana@example.ca");
        using var elsewhere = await Accounts.SignInAsync(factory, "dana@example.ca");

        using var left = await here.DeleteAsync("/api/members/me", TestContext.Current.CancellationToken);
        using var stillThere = await elsewhere.GetAsync("/api/members/me", TestContext.Current.CancellationToken);
        using var again = Accounts.Browser(factory);
        using var signedIn = await SignInAsync(again, "dana@example.ca", Accounts.Password);
        using var joined = await again.PostAsJsonAsync(
            "/api/members",
            new { name = "Dana Again", churchId = Grace.Id, newChurchName = (string?)null, newChurchCity = (string?)null, declaresChristian = true },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, left.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, stillThere.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, signedIn.StatusCode);
        Assert.Equal(HttpStatusCode.Created, joined.StatusCode);
    }

    /// <summary>Sign-in is also throttled per address; each test starts a window of its own.</summary>
    private void StartAFreshWindow() => factory.Clock.Advance(TimeSpan.FromMinutes(16));

    private static Task<HttpResponseMessage> SignInAsync(HttpClient client, string email, string password) =>
        client.PostAsJsonAsync("/api/session", new { email, password }, TestContext.Current.CancellationToken);

    private static async Task FailAsync(HttpClient client, string email, int times)
    {
        for (var attempt = 0; attempt < times; attempt++)
        {
            using var refused = await SignInAsync(client, email, "not the password at all");
            Assert.Equal(HttpStatusCode.Unauthorized, refused.StatusCode);
        }
    }

    private async Task ChangeMemberAsync(Guid id, Action<Member> change)
    {
        using var scope = factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        change(await database.Members.SingleAsync(member => member.Id == id, TestContext.Current.CancellationToken));
        await database.SaveChangesAsync(TestContext.Current.CancellationToken);
    }
}
