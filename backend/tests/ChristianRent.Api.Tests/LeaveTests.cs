// Acceptance Test
// Traces to: L2-017, L2-025, L2-028
// Description: A handler that needs a member refuses anyone else with not_a_member; DELETE /api/members/me makes a member leave, and their listings and photos stop being public at once.
using System.Net;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class LeaveTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    // L2-017 criterion 5; L2-025 criterion 4: a signed-in person who is not a member is refused
    // by a handler that needs a member, with the code the screens branch on.
    [Fact]
    public async Task A_signed_in_person_who_is_not_a_member_is_refused_not_a_member()
    {
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.DeleteAsync("/api/members/me", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("not_a_member", (await Problem.ReadAsync(response)).Code);
    }

    // L2-028 criterion 2: a member who leaves is no longer a member, and their listings and
    // photos are no longer public, at once.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task A_member_who_leaves_stops_being_a_member_and_their_listings_and_photos_stop_being_public()
    {
        var photo = Guid.NewGuid();
        var dan = TestData.Member("Pastor Dan Whitaker", TestData.Grace, signInId: "dan-whitaker");
        var hall = TestData.ForRent(dan, "Sunlit fellowship hall for 80", TestData.At(2), photoId: photo);
        await _factory.SeedAsync(TestData.Grace, dan, hall);
        _factory.PhotoStorage.Put($"{photo:N}/card.jpg", [0xFF, 0xD8, 0xFF, 0xD9]);
        using var client = _factory.CreateSignedInClient("dan-whitaker");
        using var anyone = _factory.CreateHttpsClient();
        using (var before = await anyone.GetAsync($"/api/photos/{photo}/card", TestContext.Current.CancellationToken))
        {
            Assert.Equal(HttpStatusCode.OK, before.StatusCode);
        }

        using var response = await client.DeleteAsync("/api/members/me", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        using var me = await client.GetAsync("/api/members/me", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NoContent, me.StatusCode);
        using var listing = await anyone.GetAsync($"/api/listings/{hall.Id}", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, listing.StatusCode);
        using var card = await anyone.GetAsync($"/api/photos/{photo}/card", TestContext.Current.CancellationToken);
        Assert.Equal(HttpStatusCode.NotFound, card.StatusCode);
        var browse = await anyone.GetStringAsync("/api/listings", TestContext.Current.CancellationToken);
        Assert.DoesNotContain(hall.Id.ToString(), browse, StringComparison.Ordinal);

        using var scope = _factory.Services.CreateScope();
        var left = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Members.SingleAsync(TestContext.Current.CancellationToken);
        Assert.Equal(MemberStatus.Departed, left.Status);
        Assert.Equal(_factory.Clock.GetUtcNow(), left.DepartedAt);
        Assert.Null(left.SignInId);
    }
}
