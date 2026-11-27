using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using ChristianRent.Api.Tests.Support;
using ChristianRent.Domain.Members;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests;

/// <summary>
/// L2-038, L2-040 criterion 3 and L2-025 criterion 1 (ADR 0029): each application's session works
/// on its own endpoints only, a person who is not an admin gets no admin access through Admin's
/// session, and the photo rules hold for each caller. Real cookies, one case per row.
/// </summary>
public sealed class SessionSeparationTests : IAsyncLifetime, IDisposable
{
    private static readonly byte[] Jpeg = [0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 0xFF, 0xD9];

    private readonly ApiFactory _factory = new();
    private readonly Member _naomi = TestData.Member("Naomi Friesen", TestData.Grace);
    private readonly Member _sarah = TestData.Member("Sarah Kim", TestData.Grace);
    private readonly Guid _waitingPhoto = Guid.NewGuid();

    public async ValueTask InitializeAsync()
    {
        _naomi.MakeAdmin();
        await Accounts.CreateAsync(_factory, "naomi@example.ca", _naomi.Id, TestData.Grace, _naomi, _sarah,
            TestData.ForRent(_sarah, "Hall waiting for review", approvedAt: null, photoId: _waitingPhoto));
        await Accounts.CreateAsync(_factory, "sarah@example.ca", _sarah.Id);
        _factory.PhotoStorage.Put($"{_waitingPhoto:N}/thumb.jpg", Jpeg);
    }

    public ValueTask DisposeAsync() => ValueTask.CompletedTask;

    public void Dispose() => _factory.Dispose();

    // Who holds which session, and what each endpoint answers them.
    [Theory]
    [Trait("Category", "Critical")]
    [InlineData("admin in Admin", "GET", "/api/admin/session", HttpStatusCode.OK)]
    [InlineData("admin in Admin", "GET", "/api/admin/review-queue", HttpStatusCode.OK)]
    [InlineData("admin in Admin", "GET", "/api/members/me", HttpStatusCode.Unauthorized)]
    [InlineData("admin in Admin", "POST", "/api/reports", HttpStatusCode.Unauthorized)]
    [InlineData("admin in rent", "GET", "/api/members/me", HttpStatusCode.OK)]
    [InlineData("admin in rent", "GET", "/api/admin/review-queue", HttpStatusCode.Unauthorized)]
    [InlineData("admin in rent", "GET", "/api/admin/session", HttpStatusCode.Unauthorized)]
    [InlineData("member in Admin", "GET", "/api/admin/session", HttpStatusCode.OK)]
    [InlineData("member in Admin", "GET", "/api/admin/review-queue", HttpStatusCode.Forbidden)]
    [InlineData("member in rent", "GET", "/api/admin/review-queue", HttpStatusCode.Unauthorized)]
    [InlineData("both, admin", "GET", "/api/admin/review-queue", HttpStatusCode.OK)]
    [InlineData("both, admin", "GET", "/api/members/me", HttpStatusCode.OK)]
    [InlineData("nobody", "GET", "/api/admin/session", HttpStatusCode.Unauthorized)]
    public async Task Each_session_works_on_its_own_application_alone(string who, string method, string path, HttpStatusCode status)
    {
        using var client = await ClientAsync(who);

        using var response = await client.SendAsync(new HttpRequestMessage(new HttpMethod(method), path)
        {
            Content = method == "POST" ? JsonContent.Create(new { }) : null,
        }, TestContext.Current.CancellationToken);

        Assert.Equal(status, response.StatusCode);
        if (status == HttpStatusCode.Unauthorized)
        {
            Assert.Equal("not_signed_in", (await Problem.ReadAsync(response)).Code);
        }
        else if (status == HttpStatusCode.Forbidden)
        {
            Assert.Equal("not_an_admin", (await Problem.ReadAsync(response)).Code);
        }
    }

    // L2-038 criteria 1 and 3: who Admin's session says is signed in.
    [Theory]
    [InlineData("admin in Admin", "Naomi Friesen", true)]
    [InlineData("member in Admin", "Sarah Kim", false)]
    public async Task Admin_says_who_is_signed_in_to_it(string who, string name, bool isAdmin)
    {
        using var client = await ClientAsync(who);

        var me = await client.GetFromJsonAsync<JsonElement>("/api/admin/session", TestContext.Current.CancellationToken);

        Assert.Equal(name, me.GetProperty("name").GetString());
        Assert.Equal(isAdmin, me.GetProperty("isAdmin").GetBoolean());
    }

    // L2-039 criterion 3: signing out of one application leaves the other signed in.
    [Theory]
    [InlineData("/api/admin/session", "/api/members/me", "/api/admin/session")]
    [InlineData("/api/session", "/api/admin/session", "/api/members/me")]
    public async Task Signing_out_of_one_application_leaves_the_other_signed_in(string signOut, string stillIn, string nowOut)
    {
        using var client = await ClientAsync("both, admin");

        using var signedOut = await client.DeleteAsync(signOut, TestContext.Current.CancellationToken);
        using var other = await client.GetAsync(stillIn, TestContext.Current.CancellationToken);
        using var same = await client.GetAsync(nowOut, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.NoContent, signedOut.StatusCode);
        Assert.Equal(HttpStatusCode.OK, other.StatusCode);
        Assert.Equal(HttpStatusCode.Unauthorized, same.StatusCode);
    }

    // L2-019 criterion 13; ADR 0029: the photo of a listing waiting for review, per caller and path.
    [Theory]
    [InlineData("admin in Admin", "/api/admin/photos", HttpStatusCode.OK)]
    [InlineData("member in Admin", "/api/admin/photos", HttpStatusCode.Forbidden)]
    [InlineData("member in rent", "/api/admin/photos", HttpStatusCode.Unauthorized)]
    [InlineData("member in rent", "/api/photos", HttpStatusCode.OK)]
    [InlineData("admin in Admin", "/api/photos", HttpStatusCode.NotFound)]
    [InlineData("nobody", "/api/photos", HttpStatusCode.NotFound)]
    public async Task A_waiting_listing_s_photo_follows_the_rules_for_each_caller(string who, string path, HttpStatusCode status)
    {
        using var client = await ClientAsync(who);

        using var response = await client.GetAsync($"{path}/{_waitingPhoto}/thumb", TestContext.Current.CancellationToken);

        Assert.Equal(status, response.StatusCode);
    }

    // The review queue names Admin's own photo addresses.
    [Fact]
    public async Task The_review_queue_names_photos_on_Admin_s_own_path()
    {
        await using var scope = _factory.Services.CreateAsyncScope();
        var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var listing = database.Listings.Single();
        database.ReviewItems.Add(Domain.Review.ReviewItem.ForNewListing(listing.Id, _factory.Clock.GetUtcNow()));
        await database.SaveChangesAsync(TestContext.Current.CancellationToken);
        using var client = await ClientAsync("admin in Admin");

        var page = await client.GetFromJsonAsync<JsonElement>("/api/admin/review-queue", TestContext.Current.CancellationToken);

        Assert.Equal($"/api/admin/photos/{_waitingPhoto}/thumb", page.GetProperty("items")[0].GetProperty("thumbUrl").GetString());
    }

    private async Task<HttpClient> ClientAsync(string who) => who switch
    {
        "admin in Admin" => await Accounts.SignInAsync(_factory, "naomi@example.ca", "/api/admin/session"),
        "admin in rent" => await Accounts.SignInAsync(_factory, "naomi@example.ca"),
        "member in Admin" => await Accounts.SignInAsync(_factory, "sarah@example.ca", "/api/admin/session"),
        "member in rent" => await Accounts.SignInAsync(_factory, "sarah@example.ca"),
        "both, admin" => await BothAsync(),
        _ => Accounts.Browser(_factory),
    };

    /// <summary>One browser signed in to both, as on localhost, where both cookies reach both.</summary>
    private async Task<HttpClient> BothAsync()
    {
        var client = Accounts.Browser(_factory);
        foreach (var path in new[] { "/api/session", "/api/admin/session" })
        {
            using var signedIn = await client.PostAsJsonAsync(
                path, new { email = "naomi@example.ca", password = Accounts.Password }, TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.OK, signedIn.StatusCode);
        }

        return client;
    }
}
