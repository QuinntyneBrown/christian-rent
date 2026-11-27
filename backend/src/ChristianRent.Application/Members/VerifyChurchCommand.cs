using MediatR;

namespace ChristianRent.Application.Members;

/// <summary>
/// An admin confirms a church (verify-members-and-churches design). <see cref="Id"/> is the
/// address's text.
/// </summary>
public sealed record VerifyChurchCommand(string Id) : IRequest;
