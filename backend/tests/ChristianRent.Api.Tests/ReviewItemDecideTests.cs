// Unit Test
// Traces to: L2-020
// Description: ReviewItem allows Approve or Remove for a new listing and a new member, Keep or Remove for a report, records one decision with the admin and the time, and refuses a second.
using ChristianRent.Domain.Review;

namespace ChristianRent.Api.Tests;

public sealed class ReviewItemDecideTests
{
    private static readonly DateTimeOffset Now = new(2026, 6, 8, 15, 0, 0, TimeSpan.Zero);
    private static readonly Guid Naomi = Guid.NewGuid();

    // The decision table of the decide-review-item design, one case per row (L2-020, criterion 8).
    [Theory]
    [InlineData(ReviewItemKind.NewListing, ReviewDecision.Approve, true)]
    [InlineData(ReviewItemKind.NewListing, ReviewDecision.Remove, true)]
    [InlineData(ReviewItemKind.NewListing, ReviewDecision.Keep, false)]
    [InlineData(ReviewItemKind.Report, ReviewDecision.Keep, true)]
    [InlineData(ReviewItemKind.Report, ReviewDecision.Remove, true)]
    [InlineData(ReviewItemKind.Report, ReviewDecision.Approve, false)]
    [InlineData(ReviewItemKind.NewMember, ReviewDecision.Approve, true)]
    [InlineData(ReviewItemKind.NewMember, ReviewDecision.Remove, true)]
    [InlineData(ReviewItemKind.NewMember, ReviewDecision.Keep, false)]
    public void A_kind_allows_its_own_decisions(ReviewItemKind kind, ReviewDecision decision, bool allowed)
    {
        var item = ItemOf(kind);

        if (allowed)
        {
            item.Decide(decision, Naomi, Now);
            Assert.Equal((decision, Naomi, Now), (item.Decision!.Value, item.DecidedById!.Value, item.DecidedAt!.Value));
        }
        else
        {
            Assert.Throws<ArgumentOutOfRangeException>(() => item.Decide(decision, Naomi, Now));
            Assert.Null(item.Decision);
        }
    }

    // L2-020 criterion 5: the first decision stands, and every decision changes the version.
    [Fact]
    public void A_second_decision_is_refused_and_the_first_stands()
    {
        var item = ItemOf(ReviewItemKind.NewListing);
        var before = item.Version;
        item.Decide(ReviewDecision.Approve, Naomi, Now);

        var refused = Assert.Throws<ReviewItemAlreadyDecidedException>(() => item.Decide(ReviewDecision.Remove, Guid.NewGuid(), Now.AddMinutes(5)));

        Assert.Equal((ReviewDecision.Approve, Now), (refused.Decision, refused.DecidedAt));
        Assert.Equal((ReviewDecision.Approve, Naomi), (item.Decision!.Value, item.DecidedById!.Value));
        Assert.NotEqual(before, item.Version);
    }

    private static ReviewItem ItemOf(ReviewItemKind kind) => kind switch
    {
        ReviewItemKind.NewListing => ReviewItem.ForNewListing(Guid.NewGuid(), Now),
        ReviewItemKind.Report => ReviewItem.ForReport(Guid.NewGuid(), Now),
        _ => ReviewItem.ForNewMember(Guid.NewGuid(), Now),
    };
}
