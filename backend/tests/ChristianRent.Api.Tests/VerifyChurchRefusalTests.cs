// Acceptance Test
// Traces to: L2-018, L2-025
// Description: Nobody but an admin signed in to Admin sets a verified mark: everyone else is refused alike whether the church exists or not, a member cannot mark themselves or their church as they join, and an admin is told when a church does not exist.
using System.Net;
using System.Net.Http.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

public sealed class VerifyChurchRefusalTests : IDisposable
{
    private static readonly Guid Unknown = Guid.Parse("c4a7e1f0-0099-4000-8000-000000000099");

    private readonly ProbeApiFactory _factory = new();
    private readonly Member _alicia = TestData.Member("Dr. Alicia Gomez", TestData.StPauls, isVerified: false, signInId: "alicia-gomez");

    public void Dispose() => _factory.Dispose();

    // L2-018 criteria 5 and 11; L2-025 criteria 1 and 3. Each row: who asks, holding which
    // session, and what they are answered, for a church that exists and for one that does not.
    [Theory]
    [InlineData(null, null, HttpStatusCode.Unauthorized, "not_signed_in")]
    [InlineData("alicia-gomez", "member", HttpStatusCode.Unauthorized, "not_signed_in")]
    [InlineData("not-a-member", "member", HttpStatusCode.Unauthorized, "not_signed_in")]
    [InlineData("alicia-gomez", "admin", HttpStatusCode.Forbidden, "not_an_admin")]
    [InlineData("not-a-member", "admin", HttpStatusCode.Forbidden, "not_an_admin")]
    public async Task Anyone_but_an_admin_is_refused_alike_for_any_church(string? signInId, string? session, HttpStatusCode status, string code)
    {
        await _factory.SeedAsync(TestData.StPauls, _alicia);
        using var client = signInId is null ? _factory.CreateHttpsClient() : _factory.CreateSignedInClient(signInId, session);

        foreach (var churchId in new[] { TestData.StPauls.Id, Unknown })
        {
            using var response = await client.PostAsync(
                $"/api/admin/churches/{churchId}/verification", null, TestContext.Current.CancellationToken);

            Assert.Equal(status, response.StatusCode);
            Assert.Equal(code, (await Problem.ReadAsync(response)).Code);
        }

        Assert.False(await IsVerifiedAsync());
    }

    // L2-018 criterion 11: an admin is told that a church does not exist.
    [Theory]
    [InlineData("c4a7e1f0-0099-4000-8000-000000000099")]
    [InlineData("st-pauls")]
    public async Task An_admin_is_told_a_church_does_not_exist(string id)
    {
        await _factory.SeedAsync(TestData.StPauls);
        using var admin = _factory.CreateMemberClient(Guid.NewGuid(), admin: true);

        using var response = await admin.PostAsync(
            $"/api/admin/churches/{id}/verification", null, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal("not_found", (await Problem.ReadAsync(response)).Code);
        Assert.False(await IsVerifiedAsync());
    }

    // L2-018 criterion 5: what a person sends as they join sets no mark, on them or on the
    // church they enter.
    [Fact]
    public async Task A_person_who_joins_cannot_mark_themselves_or_their_church()
    {
        using var client = _factory.CreateSignedInClient("sarah-kim");

        using var response = await client.PostAsJsonAsync(
            "/api/members",
            new
            {
                name = "Sarah Kim",
                newChurchName = "Fort Langley Evangelical Free",
                newChurchCity = "Fort Langley",
                declaresChristian = true,
                isVerified = true,
                churchIsVerified = true,
                church = new { isVerified = true },
            },
            TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var scope = _factory.Services.CreateScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        Assert.False((await database.Members.SingleAsync(TestContext.Current.CancellationToken)).IsVerified);
        Assert.False((await database.Churches.SingleAsync(TestContext.Current.CancellationToken)).IsVerified);
    }

    private async Task<bool> IsVerifiedAsync()
    {
        using var scope = _factory.Services.CreateScope();
        var church = await scope.ServiceProvider.GetRequiredService<AppDbContext>().Churches
            .AsNoTracking().SingleAsync(church => church.Id == TestData.StPauls.Id, TestContext.Current.CancellationToken);
        return church.IsVerified;
    }
}
