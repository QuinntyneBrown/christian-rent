using MediatR;

namespace ChristianRent.Application.Review;

/// <summary>
/// An admin's decision on a waiting item (L2-020): <c>approve</c>, <c>keep</c> or <c>remove</c>.
/// </summary>
public sealed record DecideReviewItemCommand(string Id, string? Decision) : IRequest;
