using ChristianRent.Domain.Listings;

namespace ChristianRent.Application.Listings;

/// <summary>The words the API uses for the listing enumerations, as the specs write them.</summary>
public static class ListingWords
{
    public static string Of(ListingOffer offer) => offer switch
    {
        ListingOffer.ForRent => "for-rent",
        ListingOffer.Wanted => "wanted",
        _ => throw new ArgumentOutOfRangeException(nameof(offer)),
    };

    public static string Of(ListingKind kind) => kind switch
    {
        ListingKind.Space => "space",
        ListingKind.Thing => "thing",
        _ => throw new ArgumentOutOfRangeException(nameof(kind)),
    };

    public static string Of(PricePeriod period) => period switch
    {
        PricePeriod.Hour => "hour",
        PricePeriod.Day => "day",
        PricePeriod.Week => "week",
        PricePeriod.Month => "month",
        _ => throw new ArgumentOutOfRangeException(nameof(period)),
    };
}
