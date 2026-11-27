using System.Net;
using System.Net.Http.Json;
using ChristianRent.Api.Tests.Support;

namespace ChristianRent.Api.Tests;

/// <summary>
/// L2-037 criterion 4 and L2-027 criterion 5 (ADR 0029): more than 10 sign-in attempts from one
/// address in 15 minutes are refused with 429 and Retry-After, on top of the limits per minute.
/// </summary>
public sealed class SignInThrottleTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    [Fact]
    public async Task The_eleventh_attempt_from_one_address_in_15_minutes_is_refused_until_the_window_ends()
    {
        await Accounts.CreateAsync(factory, "busy@example.ca");
        using var client = Accounts.Browser(factory);
        for (var attempt = 0; attempt < 10; attempt++)
        {
            using var refused = await SignInAsync(client, "anyone-" + attempt + "@example.ca");
            Assert.Equal(HttpStatusCode.Unauthorized, refused.StatusCode);
        }

        using var limited = await SignInAsync(client, "busy@example.ca", Accounts.Password);
        factory.Clock.Advance(TimeSpan.FromMinutes(15));
        using var later = await SignInAsync(client, "busy@example.ca", Accounts.Password);

        Assert.Equal(HttpStatusCode.TooManyRequests, limited.StatusCode);
        Assert.Equal("rate_limited", (await Problem.ReadAsync(limited)).Code);
        Assert.Equal("900", limited.Headers.RetryAfter?.ToString());
        Assert.Equal(HttpStatusCode.NoContent, later.StatusCode);
    }

    private static Task<HttpResponseMessage> SignInAsync(HttpClient client, string email, string password = "not the password at all") =>
        client.PostAsJsonAsync("/api/session", new { email, password }, TestContext.Current.CancellationToken);
}
