namespace ChristianRent.Domain.Review;

/// <summary>What waits in the review queue (L2-019): a new listing, a report or a new member.</summary>
public enum ReviewItemKind
{
    NewListing,
    Report,
    NewMember,
}
