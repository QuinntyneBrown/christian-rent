using System.Net;
using ChristianRent.Api.Tests.Probe;
using ChristianRent.Api.Tests.Support;
using Microsoft.Extensions.Logging;

namespace ChristianRent.Api.Tests;

/// <summary>L2-033 criterion 4: an unhandled error is a ProblemDetails with no stack trace, recorded with a trace id.</summary>
public sealed class UnhandledErrorTests(ProbeApiFactory factory) : IClassFixture<ProbeApiFactory>
{
    [Fact]
    [Trait("Category", "Critical")]
    public async Task An_unhandled_error_answers_500_without_detail_and_is_recorded_with_its_trace_id()
    {
        using var client = factory.CreateMemberClient(Guid.NewGuid());

        using var response = await client.GetAsync("/api/test-probe/fail/bug", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
        var problem = await Problem.ReadAsync(response);
        Assert.Equal("unexpected", problem.Code);
        Assert.Equal("Something went wrong", problem.Title);
        Assert.False(string.IsNullOrEmpty(problem.TraceId));
        var raw = problem.Body.GetRawText();
        Assert.DoesNotContain(FailHandler.SecretDetail, raw, StringComparison.Ordinal);
        Assert.DoesNotContain("InvalidOperationException", raw, StringComparison.Ordinal);
        Assert.DoesNotContain(" at ", raw, StringComparison.Ordinal);

        var recorded = Assert.Single(factory.Logs.Entries, entry =>
            entry.Level == LogLevel.Error && entry.Exception is InvalidOperationException);
        Assert.Equal(problem.TraceId, recorded.Values["TraceId"]);
    }
}
