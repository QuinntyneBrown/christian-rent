using ChristianRent.Domain.Review;

namespace ChristianRent.Application.Review;

/// <summary>The words the API uses for the kinds of review item.</summary>
public static class ReviewWords
{
    public static string Of(ReviewItemKind kind) => kind switch
    {
        ReviewItemKind.NewListing => "new-listing",
        ReviewItemKind.Report => "report",
        ReviewItemKind.NewMember => "new-member",
        _ => throw new ArgumentOutOfRangeException(nameof(kind)),
    };
}
