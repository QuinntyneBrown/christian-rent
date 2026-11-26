using MediatR;

namespace ChristianRent.Application.Review;

/// <summary>
/// An admin decides a review item (decide-review-item design). <see cref="Id"/> is the address's
/// text; <see cref="Decision"/> is <c>approve</c>, <c>keep</c> or <c>remove</c>; and
/// <see cref="Version"/> is the version of the item the admin read (ADR 0026).
/// </summary>
public sealed record DecideReviewItemCommand(string Id, string? Decision, int Version) : IRequest<DecidedDto>;

/// <summary>What the request's body carries; the item comes from the address.</summary>
public sealed record DecisionRequest(string? Decision, int Version);

/// <summary>The items a decision closed: the one decided, and any other it closed with it.</summary>
public sealed record DecidedDto(IReadOnlyList<Guid> ClosedItemIds);
