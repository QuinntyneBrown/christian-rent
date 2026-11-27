using System.Net;
using System.Net.Http.Json;
using ChristianRent.Api.Tests.Support;

namespace ChristianRent.Api.Tests;

/// <summary>
/// L2-027 criteria 2 and 5 and L2-041 criterion 4 (ADR 0029): signing in and out are refused from
/// another site, which prevents login CSRF, and each application's endpoints accept writes from
/// its own origin alone. One case per row.
/// </summary>
public sealed class SignInCrossSiteTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Theory]
    [InlineData("POST", "/api/session", "Origin", ApiFactory.SiteOrigin, false)]
    [InlineData("POST", "/api/session", "Origin", ApiFactory.AdminOrigin, true)]
    [InlineData("POST", "/api/session", "Origin", "https://evil.example", true)]
    [InlineData("POST", "/api/admin/session", "Origin", ApiFactory.AdminOrigin, false)]
    [InlineData("POST", "/api/admin/session", "Origin", ApiFactory.SiteOrigin, true)]
    [InlineData("POST", "/api/admin/session", "Sec-Fetch-Site", "same-site", true)]
    [InlineData("POST", "/api/admin/session", "Sec-Fetch-Site", "same-origin", false)]
    [InlineData("DELETE", "/api/session", "Origin", "https://evil.example", true)]
    [InlineData("DELETE", "/api/admin/session", "Origin", ApiFactory.SiteOrigin, true)]
    [InlineData("DELETE", "/api/admin/session", "Origin", ApiFactory.AdminOrigin, false)]
    public async Task Sign_in_and_sign_out_are_accepted_from_their_own_application_s_origin_alone(
        string method, string path, string header, string value, bool refused)
    {
        using var client = Accounts.Browser(factory);
        using var request = new HttpRequestMessage(new HttpMethod(method), path)
        {
            Content = method == "POST" ? JsonContent.Create(new { email = "nobody@example.ca", password = "whatever it is" }) : null,
        };
        request.Headers.Add(header, value);

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        if (refused)
        {
            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
            Assert.Equal("cross_site_request", (await Problem.ReadAsync(response)).Code);
        }
        else
        {
            Assert.NotEqual(HttpStatusCode.Forbidden, response.StatusCode);
        }
    }

    // A page of `rent` on its own origin writing to Admin's endpoints is refused, even when the
    // browser calls it same-origin, as both proxies make it on localhost.
    [Fact]
    public async Task A_write_to_Admin_from_rent_s_origin_is_refused_even_through_its_own_proxy()
    {
        using var client = Accounts.Browser(factory);
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/admin/review-queue/x/decision")
        {
            Content = JsonContent.Create(new { decision = "approve", version = 1 }),
        };
        request.Headers.Add("Sec-Fetch-Site", "same-origin");
        request.Headers.Add("Origin", ApiFactory.SiteOrigin);

        using var response = await client.SendAsync(request, TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        Assert.Equal("cross_site_request", (await Problem.ReadAsync(response)).Code);
    }
}
