using ChristianRent.Api.Access;
using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Members;
using ChristianRent.Application.Sessions;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Review;

/// <summary>
/// Signing in to Admin, out of it, and who is signed in to it (L2-038, L2-039; ADR 0029). Signing
/// in and out are open to anyone not signed in, as L2-025 criterion 1 names them; who is signed in
/// needs the Admin session. Each action sends one request and checks nothing itself.
/// </summary>
[ApiController]
[Route("api/admin/session")]
public sealed class AdminSessionController(ISender sender) : ControllerBase
{
    /// <summary>Who is signed in to Admin: 200 the member, with whether they are an admin, or 204 for an account that is not a member.</summary>
    [HttpGet]
    [Authorize(Policy = AccessExtensions.AdminSessionPolicy)]
    public async Task<IActionResult> Me(CancellationToken cancellationToken) =>
        await sender.Send(new GetCurrentMemberQuery(), cancellationToken) is { } member ? Ok(member) : NoContent();

    /// <summary>Signs in to Admin: 200 the member, or 204; sets the Admin cookie only.</summary>
    [HttpPost]
    [AllowAnonymous]
    public async Task<IActionResult> SignIn(Members.SignInRequest request, CancellationToken cancellationToken) =>
        await sender.Send(new SignInCommand(SessionKind.Admin, request.Email ?? "", request.Password ?? ""), cancellationToken) is { } member
            ? Ok(member)
            : NoContent();

    /// <summary>Signs out of Admin only: 204, with or without a session.</summary>
    [HttpDelete]
    [AllowAnonymous]
    public async Task<IActionResult> SignOut(CancellationToken cancellationToken)
    {
        await sender.Send(new SignOutCommand(SessionKind.Admin), cancellationToken);
        return NoContent();
    }
}
