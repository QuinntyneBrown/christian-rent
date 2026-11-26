using ChristianRent.Domain.Reports;

namespace ChristianRent.Application.Reports;

/// <summary>The words the API uses for a report's reason: the values of the mock (ADR 0023).</summary>
public static class ReportWords
{
    /// <summary>The reason a word names, or null when it names none; the words are exact.</summary>
    public static ReportReason? ReasonOf(string? word) => word switch
    {
        "fake" => ReportReason.NotARealListing,
        "inappropriate" => ReportReason.Inappropriate,
        "scam" => ReportReason.Scam,
        "other" => ReportReason.SomethingElse,
        _ => null,
    };
}
