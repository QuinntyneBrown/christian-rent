namespace ChristianRent.Api.Tests.Support;

/// <summary>
/// Carries the cookies the API sets, as a browser does, but leaves their expiry to the API: the
/// tests' clock is fake (ADR 0007), so <see cref="System.Net.CookieContainer"/>, which reads the
/// real clock, would drop a cookie the API still accepts. A cookie set empty or expired in 1970
/// is removed, as sign-out does.
/// </summary>
public sealed class CookieJar : DelegatingHandler
{
    private readonly Dictionary<string, string> _cookies = new(StringComparer.Ordinal);

    /// <summary>The cookies held now, by name.</summary>
    public IReadOnlyDictionary<string, string> Cookies => _cookies;

    /// <summary>Holds a cookie as if it had been set, such as another application's.</summary>
    public void Set(string name, string value) => _cookies[name] = value;

    protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (_cookies.Count > 0)
        {
            request.Headers.Remove("Cookie");
            request.Headers.Add("Cookie", string.Join("; ", _cookies.Select(cookie => $"{cookie.Key}={cookie.Value}")));
        }

        var response = await base.SendAsync(request, cancellationToken);
        if (response.Headers.TryGetValues("Set-Cookie", out var values))
        {
            foreach (var value in values)
            {
                var pair = value.Split(';', 2)[0];
                var equals = pair.IndexOf('=', StringComparison.Ordinal);
                var name = pair[..equals];
                var content = pair[(equals + 1)..];
                if (content.Length == 0 || value.Contains("expires=Thu, 01 Jan 1970", StringComparison.OrdinalIgnoreCase))
                {
                    _cookies.Remove(name);
                }
                else
                {
                    _cookies[name] = content;
                }
            }
        }

        return response;
    }
}
