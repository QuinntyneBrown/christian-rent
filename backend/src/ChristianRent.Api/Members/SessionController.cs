using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Sessions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Members;

/// <summary>
/// Signing in to `rent` and out of it (L2-037, L2-039; ADR 0029). Both are open to anyone not
/// signed in, as L2-025 criterion 1 names them; each action sends one request and checks
/// nothing itself. Who is signed in is <c>GET /api/members/me</c>.
/// </summary>
[ApiController]
[Route("api/session")]
public sealed class SessionController(ISender sender) : ControllerBase
{
    /// <summary>Signs in: 200 the member, or 204 for an account that is not a member; sets the member cookie.</summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> SignIn(SignInRequest request, CancellationToken cancellationToken) =>
        await sender.Send(new SignInCommand(SessionKind.Member, request.Email ?? "", request.Password ?? ""), cancellationToken) is { } member
            ? Ok(member)
            : NoContent();

    /// <summary>Signs out of `rent` only: 204, with or without a session.</summary>
    [HttpDelete]
    [AllowAnonymous]
    public async Task<IActionResult> SignOut(CancellationToken cancellationToken)
    {
        await sender.Send(new SignOutCommand(SessionKind.Member), cancellationToken);
        return NoContent();
    }
}

/// <summary>What the sign-in form sends.</summary>
public sealed record SignInRequest(string? Email, string? Password);
