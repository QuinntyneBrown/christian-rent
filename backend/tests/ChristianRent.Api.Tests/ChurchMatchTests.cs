// Acceptance Test
// Traces to: L2-017
// Description: ChurchMatch.KeyOf makes one key of a church's name and city that ignores capitals, accents and spacing (ADR 0018), one case per row.
using ChristianRent.Domain.Churches;

namespace ChristianRent.Api.Tests;

public sealed class ChurchMatchTests
{
    [Theory]
    [InlineData("Grace Community Church", "Langley", "grace community church", "langley", true)]
    [InlineData("Grace Community Church", "Langley", "  Grace   Community Church ", " Langley", true)]
    [InlineData("Église Saint-Jean", "Montréal", "eglise saint-jean", "MONTREAL", true)]
    [InlineData("Grace Community Church", "Langley", "Grace Community Church", "Abbotsford", false)]
    [InlineData("St. Paul’s Anglican", "Fort Langley", "St Pauls Anglican", "Fort Langley", false)]
    [InlineData("Grace", "Community Church Langley", "Grace Community", "Church Langley", false)]
    public void Two_churches_match_only_when_their_keys_are_equal(string name, string city, string otherName, string otherCity, bool match) =>
        Assert.Equal(match, ChurchMatch.KeyOf(name, city) == ChurchMatch.KeyOf(otherName, otherCity));
}
