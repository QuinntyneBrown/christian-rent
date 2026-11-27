using System.Net.Http.Json;
using ChristianRent.Application.Members;
using ChristianRent.Infrastructure.Persistence;
using MediatR;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Api.Tests.Support;

/// <summary>
/// Accounts and sign-in through the real cookie flow (ADR 0029): an account is created as the
/// operator creates one, and a client signs in with its email and password and keeps the cookie
/// the API sets, as a browser does.
/// </summary>
public static class Accounts
{
    public const string Password = "correct horse battery staple";

    /// <summary>Enters <paramref name="rows"/>, then creates an account linked to <paramref name="memberId"/>, if any.</summary>
    public static async Task CreateAsync(ApiFactory factory, string email, Guid? memberId = null, params object[] rows)
    {
        using var scope = factory.Services.CreateScope();
        if (rows.Length > 0)
        {
            var database = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            database.AddRange(rows);
            await database.SaveChangesAsync(TestContext.Current.CancellationToken);
        }

        var made = await scope.ServiceProvider.GetRequiredService<ISender>()
            .Send(new CreateAccountCommand(email, Password, memberId), TestContext.Current.CancellationToken);
        Assert.False(made.Refused, string.Join(" ", made.Problems));
    }

    /// <summary>An HTTPS client that keeps the cookies the API sets in <paramref name="jar"/>.</summary>
    public static HttpClient Browser(ApiFactory factory, CookieJar? jar = null) =>
        factory.CreateDefaultClient(new Uri("https://localhost"), jar ?? new CookieJar());

    /// <summary>Signs a fresh client in to <paramref name="path"/> (/api/session or /api/admin/session).</summary>
    public static async Task<HttpClient> SignInAsync(ApiFactory factory, string email, string path = "/api/session", string password = Password, CookieJar? jar = null)
    {
        var client = Browser(factory, jar);
        using var response = await client.PostAsJsonAsync(path, new { email, password }, TestContext.Current.CancellationToken);
        Assert.True(response.IsSuccessStatusCode, $"Signing in answered {(int)response.StatusCode}.");
        return client;
    }

    /// <summary>The Set-Cookie header of a response for the cookie named <paramref name="name"/>.</summary>
    public static string? SetCookie(HttpResponseMessage response, string name) =>
        response.Headers.TryGetValues("Set-Cookie", out var values)
            ? values.FirstOrDefault(value => value.StartsWith(name + "=", StringComparison.Ordinal))
            : null;
}
