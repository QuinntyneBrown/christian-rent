namespace ChristianRent.Domain.Listings;

/// <summary>
/// A price in Canadian dollars per <see cref="Period"/> (L2-010, L2-022). Zero is shown as
/// "Free"; a wanted listing's price is what the member will pay at most.
/// </summary>
public sealed record Price(decimal Amount, PricePeriod Period)
{
    public const decimal Max = 100_000m;
}
