using Microsoft.AspNetCore.Diagnostics;

namespace ChristianRent.Api.Errors;

/// <summary>
/// The last handler (L2-033, criterion 4): it records the exception with the trace id and answers
/// a 500 ProblemDetails, whose traceId every ProblemDetails carries, with no stack trace and no exception message, in every environment.
/// </summary>
internal sealed partial class UnhandledExceptionHandler(ILogger<UnhandledExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var traceId = Problems.TraceId(httpContext);
        LogUnhandled(logger, exception, traceId);

        var problem = Problems.Create(StatusCodes.Status500InternalServerError, "unexpected", "Something went wrong");
        return await Problems.WriteAsync(httpContext, problem);
    }

    [LoggerMessage(Level = LogLevel.Error, Message = "Unhandled error; trace {TraceId}")]
    private static partial void LogUnhandled(ILogger logger, Exception exception, string traceId);
}
