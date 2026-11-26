using ChristianRent.Application.Abstractions;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Members;

/// <summary>A church to pick when joining, shown as "{name}, {city}" (L2-017, criterion 8).</summary>
public sealed record ChurchOptionDto(Guid Id, string Name, string City);

/// <summary>Every church, ordered by name and then city, for the join dialog (become-member design).</summary>
public sealed record ListChurchesQuery : IRequest<IReadOnlyList<ChurchOptionDto>>;

internal sealed class ListChurchesQueryHandler(IAppDbContext database)
    : IRequestHandler<ListChurchesQuery, IReadOnlyList<ChurchOptionDto>>
{
    public async Task<IReadOnlyList<ChurchOptionDto>> Handle(ListChurchesQuery request, CancellationToken cancellationToken) =>
        await database.Churches
            .AsNoTracking()
            .OrderBy(church => church.Name)
            .ThenBy(church => church.City)
            .Select(church => new ChurchOptionDto(church.Id, church.Name, church.City))
            .ToListAsync(cancellationToken);
}
