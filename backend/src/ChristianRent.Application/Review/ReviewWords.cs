using ChristianRent.Domain.Review;

namespace ChristianRent.Application.Review;

/// <summary>The words the API uses for the kinds of review item and the decisions.</summary>
public static class ReviewWords
{
    public static string Of(ReviewItemKind kind) => kind switch
    {
        ReviewItemKind.NewListing => "new-listing",
        ReviewItemKind.Report => "report",
        ReviewItemKind.NewMember => "new-member",
        _ => throw new ArgumentOutOfRangeException(nameof(kind)),
    };

    public static string Of(ReviewDecision decision) => decision switch
    {
        ReviewDecision.Approve => "approve",
        ReviewDecision.Keep => "keep",
        ReviewDecision.Remove => "remove",
        _ => throw new ArgumentOutOfRangeException(nameof(decision)),
    };

    /// <summary>The decision a request's word names, or null.</summary>
    public static ReviewDecision? DecisionOf(string? word) => word switch
    {
        "approve" => ReviewDecision.Approve,
        "keep" => ReviewDecision.Keep,
        "remove" => ReviewDecision.Remove,
        _ => null,
    };
}
