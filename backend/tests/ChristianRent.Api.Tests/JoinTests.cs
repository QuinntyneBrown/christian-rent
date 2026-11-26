// Acceptance Test
// Traces to: L2-017, L2-025, L2-028
// Description: POST /api/members makes a signed-in person an unverified member of their church and puts them in the review queue; GET /api/members/me answers who they are.
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Review;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class JoinTests : IDisposable
{
    private readonly ProbeApiFactory _factory = new();

    public void Dispose() => _factory.Dispose();

    // L2-017 criteria 1 to 3; L2-028 criterion 1: a signed-in person joins with a name, an
    // existing church and the declaration, and becomes a member who is not verified, waiting in
    // the review queue as a new member. Only the name, the church and the sign-in are kept.
    [Fact]
    [Trait("Category", "Critical")]
    public async Task A_signed_in_person_joins_with_an_existing_church_and_waits_unverified_in_the_review_queue()
    {
        await _factory.SeedAsync(TestData.Grace);
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync(
            "/api/members",
            new { name = "Sarah Kim", churchId = TestData.Grace.Id, declaresChristian = true },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        var joined = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal("Sarah Kim", joined.GetProperty("name").GetString());
        Assert.False(joined.GetProperty("isVerified").GetBoolean());
        Assert.False(joined.GetProperty("isAdmin").GetBoolean());

        var (member, items) = await ReadAsync();
        var sarah = Assert.Single(member);
        Assert.Equal(joined.GetProperty("id").GetGuid(), sarah.Id);
        Assert.Equal("sarah-kim", sarah.SignInId);
        Assert.Equal(TestData.Grace.Id, sarah.ChurchId);
        Assert.False(sarah.IsVerified);
        Assert.Equal(MemberStatus.Active, sarah.Status);
        Assert.Equal(_factory.Clock.GetUtcNow(), sarah.JoinedAt);

        var item = Assert.Single(items);
        Assert.Equal(ReviewItemKind.NewMember, item.Kind);
        Assert.Equal(sarah.Id, item.SubjectId);
        Assert.Equal(_factory.Clock.GetUtcNow(), item.CreatedAt);
    }

    // become-member design: once joined, the same person is answered as that member.
    [Fact]
    public async Task A_member_is_answered_who_they_are()
    {
        await _factory.SeedAsync(TestData.Grace);
        using var client = _factory.CreateSignedInClient("sarah-kim");
        using var joined = await client.PostAsJsonAsync(
            "/api/members",
            new { name = "Sarah Kim", churchId = TestData.Grace.Id, declaresChristian = true },
            TestContext.Current.CancellationToken);
        var id = (await joined.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken)).GetProperty("id").GetGuid();

        using var response = await client.GetAsync("/api/members/me", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var me = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        Assert.Equal(id, me.GetProperty("id").GetGuid());
        Assert.Equal("Sarah Kim", me.GetProperty("name").GetString());
        Assert.False(me.GetProperty("isVerified").GetBoolean());
    }

    // L2-025 criterion 5: asking who is signed in is not refused for want of membership.
    [Fact]
    public async Task A_signed_in_person_who_is_not_a_member_is_answered_204()
    {
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.GetAsync("/api/members/me", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // L2-025 criterion 1 (ADR 0017): joining needs someone signed in.
    [Fact]
    public async Task Joining_without_being_signed_in_is_refused_401()
    {
        await _factory.SeedAsync(TestData.Grace);
        using var client = _factory.CreateHttpsClient();

        using var response = await client.PostAsJsonAsync(
            "/api/members",
            new { name = "Sarah Kim", churchId = TestData.Grace.Id, declaresChristian = true },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal("not_signed_in", (await Problem.ReadAsync(response)).Code);
        Assert.Empty((await ReadAsync()).Members);
    }

    private async Task<(List<Member> Members, List<ReviewItem> Items)> ReadAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var ct = TestContext.Current.CancellationToken;
        return (await database.Members.ToListAsync(ct), await database.ReviewItems.ToListAsync(ct));
    }
}
