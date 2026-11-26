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

    /// <summary>The offer a word names, or null when it names none; the words are exact.</summary>
    public static ListingOffer? OfferOf(string? word) => word switch
    {
        "for-rent" => ListingOffer.ForRent,
        "wanted" => ListingOffer.Wanted,
        _ => null,
    };

    public static string Of(ListingKind kind) => kind switch
    {
        ListingKind.Space => "space",
        ListingKind.Thing => "thing",
        _ => throw new ArgumentOutOfRangeException(nameof(kind)),
    };

    /// <summary>The kind a word names, or null when it names none; the words are exact.</summary>
    public static ListingKind? KindOf(string? word) => word switch
    {
        "space" => ListingKind.Space,
        "thing" => ListingKind.Thing,
        _ => null,
    };

    /// <summary>The period a word names, or null when it names none; the words are exact.</summary>
    public static PricePeriod? PeriodOf(string? word) => word switch
    {
        "hour" => PricePeriod.Hour,
        "day" => PricePeriod.Day,
        "week" => PricePeriod.Week,
        "month" => PricePeriod.Month,
        _ => null,
    };

    public static string Of(ListingStatus status) => status switch
    {
        ListingStatus.WaitingForReview => "waiting-for-review",
        ListingStatus.Approved => "approved",
        ListingStatus.Removed => "removed",
        _ => throw new ArgumentOutOfRangeException(nameof(status)),
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
