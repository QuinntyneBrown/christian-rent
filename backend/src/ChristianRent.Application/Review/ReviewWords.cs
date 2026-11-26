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
}
