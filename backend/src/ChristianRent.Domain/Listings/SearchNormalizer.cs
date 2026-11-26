using System.Globalization;
using System.Text;

namespace ChristianRent.Domain.Listings;

/// <summary>
/// What a search compares (L2-003; ADR 0015): text lower-cased with the invariant culture,
/// decomposed to Unicode form D and stripped of its combining marks, so "Église" and "eglise"
/// are one word. A listing's text and a search term are normalised the same way.
/// </summary>
public static class SearchNormalizer
{
    /// <summary>Only the first 100 characters of a term are used (L2-003, criterion 4).</summary>
    public const int MaxTermLength = 100;

    public static string Normalize(string? text)
    {
        if (string.IsNullOrEmpty(text))
        {
            return string.Empty;
        }

        var decomposed = text.ToLowerInvariant().Normalize(NormalizationForm.FormD);
        var kept = new StringBuilder(decomposed.Length);
        foreach (var character in decomposed)
        {
            if (CharUnicodeInfo.GetUnicodeCategory(character) != UnicodeCategory.NonSpacingMark)
            {
                kept.Append(character);
            }
        }

        return kept.ToString().Normalize(NormalizationForm.FormC);
    }

    /// <summary>The normalised words of the term's first 100 characters; none for white space.</summary>
    public static IReadOnlyList<string> Words(string? term)
    {
        if (string.IsNullOrWhiteSpace(term))
        {
            return [];
        }

        var used = term.Length > MaxTermLength ? term[..MaxTermLength] : term;
        return Normalize(used).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries);
    }
}
