// Acceptance Test
// Traces to: L2-008, L2-018, L2-019
// Description: Confirming a church through the API: an admin's confirmation marks the church on the listings of all its members and on the detail of a new member, leaves each member's own mark as it was, and records the admin and the time once.
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
    private readonly Member _alicia = TestData.Member("Dr. Alicia Gomez", TestData.StPauls, isVerified: false);
    private readonly Member _ben = TestData.Member("Ben Carter", TestData.StPauls);
    private readonly Member _marcus = TestData.Member("Marcus Lee", TestData.NewSong);
    private readonly Guid _naomi = Guid.NewGuid();

    public void Dispose() => _factory.Dispose();

    // L2-018 criteria 2 and 3: the church's mark appears on the listings of all its members, and
    // each member's own mark stays as it was.
    [Fact]
    public async Task A_confirmed_church_is_marked_on_the_listings_of_all_its_members()
    {
        var hall = TestData.ForRent(_alicia, "Parish hall with a kitchen", TestData.At(5));
        var chairs = TestData.Wanted(_ben, "Folding chairs for a wedding", TestData.At(6));
        await _factory.SeedAsync(TestData.StPauls, _alicia, _ben, hall, chairs);
        using var admin = _factory.CreateMemberClient(_naomi, admin: true);

        await ConfirmAsync(admin, TestData.StPauls.Id);

        using var anyone = _factory.CreateHttpsClient();
        var aliciasPoster = (await ReadAsync(anyone, $"/api/listings/{hall.Id}")).GetProperty("poster");
        Assert.True(aliciasPoster.GetProperty("church").GetProperty("isVerified").GetBoolean());
        Assert.False(aliciasPoster.GetProperty("isVerified").GetBoolean());
        var bensPoster = (await ReadAsync(anyone, $"/api/listings/{chairs.Id}")).GetProperty("poster");
        Assert.True(bensPoster.GetProperty("church").GetProperty("isVerified").GetBoolean());
        Assert.True(bensPoster.GetProperty("isVerified").GetBoolean());
    }

    // L2-018 criterion 3: confirming one church marks no other, and no member.
    [Fact]
    public async Task Confirming_a_church_marks_no_other_church()
    {
        var locker = TestData.Wanted(_marcus, "Storage locker for our food bank", TestData.At(5));
        await _factory.SeedAsync(TestData.StPauls, TestData.NewSong, _alicia, _marcus, locker);
        using var admin = _factory.CreateMemberClient(_naomi, admin: true);

        await ConfirmAsync(admin, TestData.StPauls.Id);

        using var anyone = _factory.CreateHttpsClient();
        var poster = (await ReadAsync(anyone, $"/api/listings/{locker.Id}")).GetProperty("poster");
        Assert.True(poster.GetProperty("isVerified").GetBoolean());
        Assert.False(poster.GetProperty("church").GetProperty("isVerified").GetBoolean());
    }

    // L2-018 criterion 7 and L2-019 criteria 9 and 16: the detail of a new member carries the
    // church to confirm, and says it is verified once it is; the member still waits.
    [Fact]
    public async Task The_detail_of_a_new_member_names_the_church_and_shows_it_confirmed()
    {
        var item = ReviewItem.ForNewMember(_alicia.Id, TestData.At(7));
        await _factory.SeedAsync(TestData.StPauls, _alicia, item);
        using var admin = _factory.CreateMemberClient(_naomi, admin: true);
        var before = (await ReadAsync(admin, $"/api/admin/review-queue/{item.Id}")).GetProperty("member").GetProperty("church");
        Assert.Equal(TestData.StPauls.Id, before.GetProperty("id").GetGuid());
        Assert.False(before.GetProperty("isVerified").GetBoolean());

        await ConfirmAsync(admin, before.GetProperty("id").GetGuid());

        var after = (await ReadAsync(admin, $"/api/admin/review-queue/{item.Id}")).GetProperty("member").GetProperty("church");
        Assert.True(after.GetProperty("isVerified").GetBoolean());
        Assert.Equal(1, (await ReadAsync(admin, "/api/admin/review-queue")).GetProperty("waitingCount").GetInt32());
        Assert.False((await StoredAsync<Member>(_alicia.Id)).IsVerified);
    }

    // L2-018 criterion 10: who confirmed and when is recorded, and a second confirmation is
    // answered as made and changes nothing.
    [Fact]
    public async Task A_confirmation_records_the_admin_and_the_time_once()
    {
        await _factory.SeedAsync(TestData.StPauls);
        using var naomi = _factory.CreateMemberClient(_naomi, admin: true);
        var first = _factory.Clock.GetUtcNow();
        await ConfirmAsync(naomi, TestData.StPauls.Id);

        _factory.Clock.Advance(TimeSpan.FromHours(2));
        using var other = _factory.CreateMemberClient(Guid.NewGuid(), admin: true);
        await ConfirmAsync(other, TestData.StPauls.Id);

        var stored = await StoredAsync<Church>(TestData.StPauls.Id);
        Assert.True(stored.IsVerified);
        Assert.Equal(_naomi, stored.VerifiedBy);
        Assert.Equal(first, stored.VerifiedAt);
    }

    private async Task<T> StoredAsync<T>(Guid id)
        where T : class
    {
        using var scope = _factory.Services.CreateScope();
        var found = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Set<T>()
            .AsNoTracking().SingleAsync(row => EF.Property<Guid>(row, "Id") == id, TestContext.Current.CancellationToken);
        return found;
    }

    private static async Task<JsonElement> ReadAsync(HttpClient client, string address)
    {
        using var response = await client.GetAsync(address, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        return await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
    }

    private static async Task ConfirmAsync(HttpClient client, Guid churchId)
    {
        using var response = await client.PostAsync(
            $"/api/admin/churches/{churchId}/verification", null, TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }
}
