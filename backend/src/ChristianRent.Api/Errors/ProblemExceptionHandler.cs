using System.Text.Json;
using ChristianRent.Application.Errors;
using FluentValidation;
using Microsoft.AspNetCore.Diagnostics;

namespace ChristianRent.Api.Errors;

/// <summary>
/// Maps each known refusal to its ProblemDetails (enforce-access design). Its title is generic;
/// a screen shows its own copy and branches on the code.
/// </summary>
internal sealed class ProblemExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        var problem = exception switch
        {
            ValidationException validation => ValidationFailed(validation),
            NotFoundException notFound => Problems.Create(StatusCodes.Status404NotFound, notFound.Code, "Not found"),
            ForbiddenException forbidden => Problems.Create(StatusCodes.Status403Forbidden, forbidden.Code, "Not allowed"),
            ConflictException conflict => Problems.Create(StatusCodes.Status409Conflict, conflict.Code, "Already done"),
            LimitReachedException limit => LimitReached(limit),
            _ => null,
        };
        return problem is not null && await Problems.WriteAsync(httpContext, problem);
    }

    private static Microsoft.AspNetCore.Mvc.ProblemDetails ValidationFailed(ValidationException exception)
    {
        var problem = Problems.Create(StatusCodes.Status400BadRequest, "validation_failed", "Check the fields");
        problem.Extensions["errors"] = exception.Errors
            .GroupBy(failure => JsonNamingPolicy.CamelCase.ConvertName(failure.PropertyName))
            .ToDictionary(group => group.Key, group => group.Select(failure => failure.ErrorMessage).ToArray());
        return problem;
    }

    private static Microsoft.AspNetCore.Mvc.ProblemDetails LimitReached(LimitReachedException exception)
    {
        var problem = Problems.Create(StatusCodes.Status429TooManyRequests, exception.Code, "Limit reached");
        problem.Extensions["retryAt"] = exception.RetryAt;
        return problem;
    }
}
