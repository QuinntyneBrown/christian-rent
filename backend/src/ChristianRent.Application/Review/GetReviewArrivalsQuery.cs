using System.Globalization;
using MediatR;

namespace ChristianRent.Application.Review;

/// <summary>
/// What has begun to wait since <see cref="Since"/>, the <c>asOf</c> of a first page of the
/// queue, counted by kind (L2-019, criterion 12; ADR 0027).
/// </summary>
public sealed record GetReviewArrivalsQuery(string? Since) : IRequest<ReviewArrivalsDto>
{
    /// <summary>The instant <paramref name="text"/> names, as this API writes one: ISO 8601 with its offset.</summary>
    public static bool TryReadInstant(string? text, out DateTimeOffset instant) =>
        DateTimeOffset.TryParseExact(
            text,
            ["yyyy-MM-dd'T'HH:mm:ss.FFFFFFFzzz", "yyyy-MM-dd'T'HH:mm:ss.FFFFFFF'Z'"],
            CultureInfo.InvariantCulture,
            DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
            out instant);
}

/// <summary>How many items of each kind arrived.</summary>
public sealed record ReviewArrivalsDto(int NewListings, int Reports, int NewMembers);
