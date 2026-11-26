using MediatR;

namespace ChristianRent.Application.Review;

/// <summary>
/// Everything needed to decide on one waiting review item (L2-019, criterion 2).
/// <see cref="Id"/> is the address as given: one that is not an identifier is answered as an
/// unknown one.
/// </summary>
public sealed record GetReviewItemQuery(string Id) : IRequest<ReviewItemDetailDto>;
