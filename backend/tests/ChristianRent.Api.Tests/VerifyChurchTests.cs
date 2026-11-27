// Acceptance Test
// Traces to: L2-018, L2-025
// Description: POST /api/churches/{id}/verification: an admin confirms a church, which marks it on the listings of all its members; everyone else is refused.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Review;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class VerifyChurchTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();

    // A church of its own: confirming it changes the row, which the shared cast must not.
    private readonly Church _stPauls = Church.Create(Guid.NewGuid(), "St. Paul’s Anglican", "Fort Langley", isVerified: false);
    private readonly Church _newSong = Church.Create(Guid.NewGuid(), "New Song Fellowship", "Langley", isVerified: false);
    private readonly Member _alicia;
    private readonly Member _ben;
    private readonly Member _marcus;
    private readonly Guid _naomi = Guid.NewGuid();

    public VerifyChurchTests()
    {
        _alicia = TestData.Member("Dr. Alicia Gomez", _stPauls, isVerified: false, signInId: "alicia-gomez");
        _ben = TestData.Member("Ben Carter", _stPauls);
        _marcus = TestData.Member("Marcus Lee", _newSong);
    }

    public void Dispose() => _factory.Dispose();

    // L2-018 criteria 2, 3 and 11: the church is marked on every listing of its members, each
    // member keeping their own mark, and who confirmed it and when is recorded. Before that, a
    // verified member of the church is marked alone. Another church is left as it was.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task A_confirmed_church_is_marked_on_the_listings_of_all_its_members()
    {
        var hall = TestData.ForRent(_alicia, "Parish hall with a kitchen", TestData.At(5));
        var chairs = TestData.Wanted(_ben, "Chairs for a supper", TestData.At(5));
        var van = TestData.Wanted(_marcus, "15-passenger van for youth camp", TestData.At(5));
        var item = ReviewItem.ForNewMember(_alicia.Id, TestData.At(7));
        await _factory.SeedAsync(_stPauls, _newSong, _alicia, _ben, _marcus, hall, chairs, van, item);
        Assert.Equal((true, false), await MarksAsync(chairs.Id));
        using var admin = _factory.CreateMemberClient(_naomi, admin: true);

        using var response = await ConfirmAsync(admin, _stPauls.Id.ToString());

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.Equal((false, true), await MarksAsync(hall.Id));
        Assert.Equal((true, true), await MarksAsync(chairs.Id));
        Assert.Equal((true, false), await MarksAsync(van.Id));
        var church = await ChurchAsync(_stPauls.Id);
        Assert.Equal(_naomi, church.VerifiedBy);
        Assert.Equal(_factory.Clock.GetUtcNow(), church.VerifiedAt);

        // The item is not decided: it still waits, and its detail names the church to confirm.
        var detail = await ReadAsync(admin, $"/api/review-queue/{item.Id}");
        var theirs = detail.GetProperty("member").GetProperty("church");
        Assert.Equal(_stPauls.Id, theirs.GetProperty("id").GetGuid());
        Assert.True(theirs.GetProperty("isVerified").GetBoolean());
    }

    // L2-018 criterion 11: a second confirmation, by anyone who is an admin, is answered as made
    // and the first record stays.
    [Fact]
    public async Task A_church_confirmed_twice_keeps_the_first_record()
    {
        await _factory.SeedAsync(_stPauls);
        using var naomi = _factory.CreateMemberClient(_naomi, admin: true);
        using var another = _factory.CreateMemberClient(Guid.NewGuid(), admin: true);
        using var first = await ConfirmAsync(naomi, _stPauls.Id.ToString());
        var at = _factory.Clock.GetUtcNow();
        _factory.Clock.Advance(TimeSpan.FromHours(1));

        using var second = await ConfirmAsync(another, _stPauls.Id.ToString());

        Assert.Equal(HttpStatusCode.NoContent, second.StatusCode);
        var church = await ChurchAsync(_stPauls.Id);
        Assert.True(church.IsVerified);
        Assert.Equal(_naomi, church.VerifiedBy);
        Assert.Equal(at, church.VerifiedAt);
    }

    // L2-018 criterion 11: to an admin, an identifier no church has is not found.
    [Theory]
    [InlineData("c4a7e1f0-9999-4000-8000-000000000999")]
    [InlineData("not-an-id")]
    public async Task An_unknown_church_is_not_found(string id)
    {
        await _factory.SeedAsync(_stPauls);
        using var admin = _factory.CreateMemberClient(_naomi, admin: true);

        using var response = await ConfirmAsync(admin, id);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await Problem.ReadAsync(response)).Code);
        Assert.False((await ChurchAsync(_stPauls.Id)).IsVerified);
    }

    // L2-018 criterion 5; L2-025: nobody but an admin sets a mark, and a refused caller learns
    // nothing of whether a church exists.
    [Theory]
    [InlineData(null, true, HttpStatusCode.Unauthorized, "not_signed_in")]
    [InlineData(null, false, HttpStatusCode.Unauthorized, "not_signed_in")]
    [InlineData("alicia-gomez", true, HttpStatusCode.Forbidden, "not_an_admin")]
    [InlineData("alicia-gomez", false, HttpStatusCode.Forbidden, "not_an_admin")]
    [InlineData("nobody-yet", true, HttpStatusCode.Forbidden, "not_an_admin")]
    public async Task Nobody_but_an_admin_confirms_a_church(string? signInId, bool exists, HttpStatusCode status, string code)
    {
        await _factory.SeedAsync(_stPauls, _alicia);
        using var caller = signInId is null ? _factory.CreateHttpsClient() : _factory.CreateSignedInClient(signInId);

        using var response = await ConfirmAsync(caller, (exists ? _stPauls.Id : Guid.NewGuid()).ToString());

        Assert.Equal(status, response.StatusCode);
        Assert.Equal(code, (await Problem.ReadAsync(response)).Code);
        var church = await ChurchAsync(_stPauls.Id);
        Assert.False(church.IsVerified);
        Assert.Null(church.VerifiedBy);
    }

    // L2-018 criterion 5: nothing a person sends as they join sets either mark.
    [Fact]
    public async Task A_person_cannot_mark_themselves_or_their_church_verified_by_joining()
    {
        using var caller = _factory.CreateSignedInClient("sarah-kim");

        using var response = await caller.PostAsJsonAsync(
            "/api/members",
            new
            {
                name = "Sarah Kim",
                newChurchName = "Willow Creek Chapel",
                newChurchCity = "Langley",
                declaresChristian = true,
                isVerified = true,
                churchIsVerified = true,
                isAdmin = true,
            },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var member = await database.Members.SingleAsync(TestContext.Current.CancellationToken);
        Assert.False(member.IsVerified);
        Assert.False(member.IsAdmin);
        Assert.False((await database.Churches.SingleAsync(TestContext.Current.CancellationToken)).IsVerified);
    }

    private static Task<HttpResponseMessage> ConfirmAsync(HttpClient client, string id) =>
        client.PostAsync($"/api/churches/{id}/verification", null, TestContext.Current.CancellationToken);

    /// <summary>Whether anyone reading the listing sees the member's mark, and the church's.</summary>
    private async Task<(bool Member, bool Church)> MarksAsync(Guid listingId)
    {
        using var anyone = _factory.CreateHttpsClient();
        var poster = (await ReadAsync(anyone, $"/api/listings/{listingId}")).GetProperty("poster");
        return (poster.GetProperty("isVerified").GetBoolean(), poster.GetProperty("church").GetProperty("isVerified").GetBoolean());
    }

    private async Task<Church> ChurchAsync(Guid id)
    {
        using var scope = _factory.Services.CreateScope();
        return await scope.ServiceProvider.GetRequiredService<AppDbContext>().Churches.AsNoTracking()
            .SingleAsync(church => church.Id == id, TestContext.Current.CancellationToken);
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string address)
    {
        using var response = await client.GetAsync(address, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }
}
