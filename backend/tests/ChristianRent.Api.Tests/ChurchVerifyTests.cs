// Acceptance Test
// Traces to: L2-018
// Description: Church.Verify, one case per row: a church is verified once, and the first admin and time stand.
using ChristianRent.Domain.Churches;

namespace ChristianRent.Api.Tests;

public sealed class ChurchVerifyTests
{
    private static readonly Guid Naomi = Guid.NewGuid();
    private static readonly DateTimeOffset Noon = new(2026, 6, 8, 12, 0, 0, TimeSpan.Zero);

    [Fact]
    public void A_church_a_member_entered_is_not_verified()
    {
        var church = Church.Enter("St. Paul’s Anglican", "Fort Langley");

        Assert.False(church.IsVerified);
        Assert.Null(church.VerifiedBy);
        Assert.Null(church.VerifiedAt);
    }

    [Fact]
    public void Confirming_records_the_admin_and_the_time()
    {
        var church = Church.Enter("St. Paul’s Anglican", "Fort Langley");

        church.Verify(Naomi, Noon);

        Assert.True(church.IsVerified);
        Assert.Equal(Naomi, church.VerifiedBy);
        Assert.Equal(Noon, church.VerifiedAt);
    }

    [Fact]
    public void Confirming_again_keeps_the_first_admin_and_time()
    {
        var church = Church.Enter("St. Paul’s Anglican", "Fort Langley");
        church.Verify(Naomi, Noon);

        church.Verify(Guid.NewGuid(), Noon.AddHours(2));

        Assert.Equal(Naomi, church.VerifiedBy);
        Assert.Equal(Noon, church.VerifiedAt);
    }

    [Fact]
    public void A_church_entered_as_verified_stays_as_it_was()
    {
        var church = Church.Create(Guid.NewGuid(), "Grace Community Church", "Langley", isVerified: true);

        church.Verify(Naomi, Noon);

        Assert.True(church.IsVerified);
        Assert.Null(church.VerifiedBy);
        Assert.Null(church.VerifiedAt);
    }
}
