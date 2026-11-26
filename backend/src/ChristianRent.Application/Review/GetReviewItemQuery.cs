using MediatR;

namespace ChristianRent.Application.Review;

/// <summary>
/// One waiting item of the review queue, by kind (L2-019, criterion 2). <see cref="Id"/> is the
/// address as given: one that is not an identifier is answered as an unknown one.
/// </summary>
public sealed record GetReviewItemQuery(string Id) : IRequest<ReviewItemDetailDto>;
