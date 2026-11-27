using ChristianRent.Application.Abstractions;
using MediatR;

namespace ChristianRent.Application.Sessions;

/// <summary>
/// Ends this application's session (L2-039): its cookie is cleared, and the other application's
/// session is untouched. With no session it changes nothing.
/// </summary>
public sealed record SignOutCommand(SessionKind Kind) : IRequest;

internal sealed class SignOutCommandHandler(ISessionCookies cookies) : IRequestHandler<SignOutCommand>
{
    public Task Handle(SignOutCommand command, CancellationToken cancellationToken) => cookies.SignOutAsync(command.Kind);
}
