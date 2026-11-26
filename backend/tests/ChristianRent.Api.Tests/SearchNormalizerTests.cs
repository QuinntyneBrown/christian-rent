using ChristianRent.Domain.Listings;

namespace ChristianRent.Api.Tests;

/// <summary>ADR 0015: what a search compares, one case per row.</summary>
public sealed class SearchNormalizerTests
{
    [Theory]
    [InlineData("Parking Space", "parking space")]
    [InlineData("ÉGLISE", "eglise")]
    [InlineData("Café crème", "cafe creme")]
    [InlineData("Saint-Hyacinthe, QC", "saint-hyacinthe, qc")]
    [InlineData("Naïve Œuvre", "naive œuvre")]
    [InlineData("", "")]
    public void Normalize_lower_cases_and_drops_accents(string text, string normalized)
    {
        Assert.Equal(normalized, SearchNormalizer.Normalize(text));
    }

    [Theory]
    [InlineData("parking", new[] { "parking" })]
    [InlineData("  Parking   CHURCH ", new[] { "parking", "church" })]
    [InlineData("Église\tcafé\nhall", new[] { "eglise", "cafe", "hall" })]
    [InlineData("   ", new string[0])]
    [InlineData(null, new string[0])]
    public void Words_are_the_normalized_words_of_a_term(string? term, string[] words)
    {
        Assert.Equal(words, SearchNormalizer.Words(term));
    }

    [Fact]
    public void Words_read_only_the_first_100_characters()
    {
        var term = "hall".PadRight(SearchNormalizer.MaxTermLength - 2) + "room";

        Assert.Equal(["hall", "ro"], SearchNormalizer.Words(term));
    }

    [Fact]
    public void A_listing_keeps_the_normalized_text_of_its_title_note_and_area()
    {
        var listing = Listing.Create(
            Guid.NewGuid(), Guid.NewGuid(), ListingOffer.ForRent, ListingKind.Space, "Salle de l’Église",
            null, "Weekdays", null, null, "Saint-Hyacinthe", "Chaises incluses.", DateTimeOffset.UnixEpoch);

        Assert.Equal("salle de l’eglise chaises incluses. saint-hyacinthe", listing.SearchText);
    }
}
