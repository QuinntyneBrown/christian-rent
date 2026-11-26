using System.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Errors;

/// <summary>Writes a ProblemDetails with the <c>code</c> a client branches on (L2-025, criterion 4).</summary>
internal static class Problems
{
    public static ProblemDetails Create(int status, string code, string title) => new()
    {
        Status = status,
        Title = title,
        Extensions = { ["code"] = code },
    };

    public static async ValueTask<bool> WriteAsync(HttpContext context, ProblemDetails problem)
    {
        context.Response.StatusCode = problem.Status ?? StatusCodes.Status500InternalServerError;
        var writer = context.RequestServices.GetRequiredService<IProblemDetailsService>();
        return await writer.TryWriteAsync(new ProblemDetailsContext { HttpContext = context, ProblemDetails = problem });
    }

    /// <summary>The trace that links a response to the record of its request.</summary>
    public static string TraceId(HttpContext context) =>
        Activity.Current?.TraceId.ToHexString() ?? context.TraceIdentifier;
}
