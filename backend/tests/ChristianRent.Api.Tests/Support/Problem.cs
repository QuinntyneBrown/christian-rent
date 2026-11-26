using System.Net.Http.Json;
using System.Text.Json;

namespace ChristianRent.Api.Tests.Support;

/// <summary>A ProblemDetails body as a client reads it.</summary>
public sealed record Problem(JsonElement Body)
{
    public string? Code => Body.TryGetProperty("code", out var code) ? code.GetString() : null;

    public string? Title => Body.TryGetProperty("title", out var title) ? title.GetString() : null;

    public string? TraceId => Body.TryGetProperty("traceId", out var traceId) ? traceId.GetString() : null;

    public static async Task<Problem> ReadAsync(HttpResponseMessage response)
    {
        Assert.Equal("application/problem+json", response.Content.Headers.ContentType?.MediaType);
        var body = await response.Content.ReadFromJsonAsync<JsonElement>(TestContext.Current.CancellationToken);
        return new Problem(body);
    }
}
