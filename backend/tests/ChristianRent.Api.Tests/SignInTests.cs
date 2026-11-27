using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;

namespace ChristianRent.Api.Tests;

/// <summary>
/// L2-037 criterion 1, L2-039 and L2-040 criterion 6 (ADR 0029): a person signs in to `rent`
/// with the email and password of their account, through the real cookie flow, asks who they
/// are, and signs out.
/// </summary>
public sealed class SignInTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private static readonly Domain.Members.Member SarahKim = TestData.Member("Sarah Kim", TestData.Grace);

    [Fact]
    [Trait("Category", "Critical")]
    public async Task A_member_signs_in_with_their_account_and_is_that_member()
    {
        await Accounts.CreateAsync(factory, "sarah.kim@example.ca", SarahKim.Id, TestData.Grace, SarahKim);
        using var client = Accounts.Browser(factory);

        using var signedIn = await client.PostAsJsonAsync(
            "/api/session", new { email = "sarah.kim@example.ca", password = Accounts.Password }, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, signedIn.StatusCode);
        Assert.Equal("Sarah Kim", (await signedIn.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("name").GetString());
        var cookie = Accounts.SetCookie(signedIn, "__Host-cr-member");
        Assert.NotNull(cookie);
        Assert.Contains("httponly", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("secure", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("samesite=strict", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.Contains("path=/", cookie, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("sarah", cookie, StringComparison.OrdinalIgnoreCase);
        var me = await client.GetFromJsonAsync<JsonElement>("/api/members/me", TestContext.Current.CancellationToken);
        Assert.Equal(SarahKim.Id.ToString(), me.GetProperty("id").GetString());
    }

    [Fact]
    public async Task An_account_that_is_not_a_member_signs_in_and_may_join()
    {
        await Accounts.CreateAsync(factory, "newcomer@example.ca");
        using var client = Accounts.Browser(factory);

        using var signedIn = await client.PostAsJsonAsync(
            "/api/session", new { email = "newcomer@example.ca", password = Accounts.Password }, TestContext.Current.CancellationToken);
        using var me = await client.GetAsync("/api/members/me", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, signedIn.StatusCode);
        Assert.Equal(HttpStatusCode.NoContent, me.StatusCode);
    }

    [Fact]
    public async Task A_wrong_password_is_refused_and_signs_nobody_in()
    {
        await Accounts.CreateAsync(factory, "wrong@example.ca");
        using var client = Accounts.Browser(factory);

        using var refused = await client.PostAsJsonAsync(
            "/api/session", new { email = "wrong@example.ca", password = "not the password at all" }, TestContext.Current.CancellationToken);
        using var me = await client.GetAsync("/api/members/me", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, refused.StatusCode);
        Assert.Equal("sign_in_failed", (await Problem.ReadAsync(refused)).Code);
        Assert.Null(Accounts.SetCookie(refused, "__Host-cr-member"));
        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
    }

    [Fact]
    public async Task Signing_out_ends_the_session()
    {
        await Accounts.CreateAsync(factory, "leaving@example.ca");
        using var client = await Accounts.SignInAsync(factory, "leaving@example.ca");

        using var signedOut = await client.DeleteAsync("/api/session", TestContext.Current.CancellationToken);
        using var me = await client.GetAsync("/api/members/me", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, signedOut.StatusCode);
        Assert.Contains("expires=thu, 01 jan 1970", Accounts.SetCookie(signedOut, "__Host-cr-member") ?? "", StringComparison.OrdinalIgnoreCase);
        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
        Assert.Equal("not_signed_in", (await Problem.ReadAsync(me)).Code);
    }

    // L2-039 criterion 4.
    [Fact]
    public async Task Signing_out_with_no_session_succeeds_and_changes_nothing()
    {
        using var client = Accounts.Browser(factory);

        using var signedOut = await client.DeleteAsync("/api/session", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, signedOut.StatusCode);
    }

    // L2-040 criterion 1: a member session lasts 14 days without a request.
    [Fact]
    public async Task A_member_session_ends_after_14_days_without_a_request()
    {
        await Accounts.CreateAsync(factory, "idle@example.ca");
        using var client = await Accounts.SignInAsync(factory, "idle@example.ca");

        factory.Clock.Advance(TimeSpan.FromDays(14) + TimeSpan.FromMinutes(1));
        using var me = await client.GetAsync("/api/members/me", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, me.StatusCode);
    }
}
