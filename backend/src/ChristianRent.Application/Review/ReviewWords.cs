using ChristianRent.Domain.Review;

namespace ChristianRent.Application.Review;

/// <summary>The words the API uses for what waits in the review queue.</summary>
public static class ReviewWords
{
    public static string Of(ReviewItemKind kind) => kind switch
    {
        ReviewItemKind.NewListing => "new-listing",
        ReviewItemKind.Report => "report",
        ReviewItemKind.NewMember => "new-member",
        _ => throw new ArgumentOutOfRangeException(nameof(kind), kind, null),
    };

    public static string Of(ReviewDecision decision) => decision switch
    {
        ReviewDecision.Approve => "approve",
        ReviewDecision.Keep => "keep",
        ReviewDecision.Remove => "remove",
        _ => throw new ArgumentOutOfRangeException(nameof(decision), decision, null),
    };

    /// <summary>The decision a client names, if it is one.</summary>
    public static ReviewDecision? DecisionOf(string? word) => word switch
    {
        "approve" => ReviewDecision.Approve,
        "keep" => ReviewDecision.Keep,
        "remove" => ReviewDecision.Remove,
        _ => null,
    };
}
