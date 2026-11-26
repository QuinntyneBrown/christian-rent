using ChristianRent.Api.Errors;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authorization.Policy;

namespace ChristianRent.Api.Access;

/// <summary>
/// Turns an authorisation refusal into a ProblemDetails a screen branches on: 401
/// <c>not_signed_in</c>, or 403 <c>not_an_admin</c> (enforce-access design).
/// </summary>
internal sealed class ProblemAuthorizationResultHandler : IAuthorizationMiddlewareResultHandler
{
    private readonly AuthorizationMiddlewareResultHandler _default = new();

    public async Task HandleAsync(RequestDelegate next, HttpContext context, AuthorizationPolicy policy, PolicyAuthorizationResult authorizeResult)
    {
        if (authorizeResult.Challenged)
        {
            await Problems.WriteAsync(context, Problems.Create(StatusCodes.Status401Unauthorized, "not_signed_in", "Sign in to do this"));
            return;
        }

        if (authorizeResult.Forbidden)
        {
            await Problems.WriteAsync(context, Problems.Create(StatusCodes.Status403Forbidden, "not_an_admin", "Not allowed"));
            return;
        }

        await _default.HandleAsync(next, context, policy, authorizeResult);
    }
}
