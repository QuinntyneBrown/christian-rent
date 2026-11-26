using ChristianRent.Application.Abstractions;
using ChristianRent.Domain.Review;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Review;

/// <summary>Counts the waiting items made after the instant, by kind. Who may ask is the controller's policy.</summary>
internal sealed class GetReviewArrivalsQueryHandler(IAppDbContext database) : IRequestHandler<GetReviewArrivalsQuery, ReviewArrivalsDto>
{
    public async Task<ReviewArrivalsDto> Handle(GetReviewArrivalsQuery query, CancellationToken cancellationToken)
    {
        GetReviewArrivalsQuery.TryReadInstant(query.Since, out var since);
        var kinds = await WaitingReviewItems.Of(database)
            .Where(item => item.CreatedAt > since)
            .Select(item => item.Kind)
            .ToListAsync(cancellationToken);
        return new ReviewArrivalsDto(
            kinds.Count(kind => kind == ReviewItemKind.NewListing),
            kinds.Count(kind => kind == ReviewItemKind.Report),
            kinds.Count(kind => kind == ReviewItemKind.NewMember));
    }
}
