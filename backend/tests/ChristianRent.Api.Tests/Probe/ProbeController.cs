using ChristianRent.Application.Errors;
using FluentValidation;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Tests.Probe;

/// <summary>
/// Endpoints that exist only in the acceptance tests, to prove the platform's cross-cuts before
/// any product endpoint exists. Like a product controller, each action sends one request and
/// checks nothing itself.
/// </summary>
[ApiController]
[Route("api/test-probe")]
public sealed class ProbeController(ISender sender) : ControllerBase
{
    [HttpGet("protected")]
    public Task<string> Protected(CancellationToken cancellationToken) =>
        sender.Send(new WhoAmIQuery(), cancellationToken);

    [HttpGet("admin")]
    [Authorize(Policy = "Admin")]
    public Task<string> Admin(CancellationToken cancellationToken) =>
        sender.Send(new WhoAmIQuery(), cancellationToken);

    [HttpPost("echo")]
    public Task<string> Echo(EchoCommand command, CancellationToken cancellationToken) =>
        sender.Send(command, cancellationToken);

    [HttpGet("fail/{kind}")]
    public Task<string> Fail(string kind, CancellationToken cancellationToken) =>
        sender.Send(new FailQuery(kind), cancellationToken);

    [HttpGet("open")]
    [AllowAnonymous]
    public Task<string> OpenRead(string? q, CancellationToken cancellationToken) =>
        sender.Send(new WhoAmIQuery(), cancellationToken);

    [HttpPost("open")]
    [AllowAnonymous]
    public Task<string> OpenWrite(CancellationToken cancellationToken) =>
        sender.Send(new WhoAmIQuery(), cancellationToken);
}

public sealed record WhoAmIQuery : IRequest<string>;

public sealed class WhoAmIHandler(ChristianRent.Application.Abstractions.ICurrentMember member)
    : IRequestHandler<WhoAmIQuery, string>
{
    public Task<string> Handle(WhoAmIQuery request, CancellationToken cancellationToken) =>
        Task.FromResult(member.MemberId?.ToString() ?? "anonymous");
}

public sealed record EchoCommand(string Name) : IRequest<string>;

public sealed class EchoCommandValidator : AbstractValidator<EchoCommand>
{
    public EchoCommandValidator()
    {
        RuleFor(command => command.Name).NotEmpty().MaximumLength(10);
    }
}

public sealed class EchoHandler : IRequestHandler<EchoCommand, string>
{
    public Task<string> Handle(EchoCommand request, CancellationToken cancellationToken) =>
        Task.FromResult(request.Name);
}

public sealed record FailQuery(string Kind) : IRequest<string>;

public sealed class FailHandler(TimeProvider clock) : IRequestHandler<FailQuery, string>
{
    public const string SecretDetail = "connection to db-7.internal refused for user rent_admin";

    public Task<string> Handle(FailQuery request, CancellationToken cancellationToken) =>
        throw (request.Kind switch
        {
            "not-found" => new NotFoundException(),
            "forbidden" => new ForbiddenException("own_listing"),
            "conflict" => new ConflictException("already_reported"),
            "limit" => new LimitReachedException("post_limit_reached", clock.GetUtcNow().AddHours(1)),
            _ => new InvalidOperationException(SecretDetail),
        });
}
