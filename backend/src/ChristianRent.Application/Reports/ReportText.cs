using System.Text;

namespace ChristianRent.Application.Reports;

/// <summary>
/// A report's note made ready for its length check and for storing (ADR 0023), as a message is:
/// line endings as <c>\n</c>, in Unicode form C, trimmed. Its line breaks are kept.
/// </summary>
public static class ReportText
{
    public static string Clean(string? note) =>
        (note ?? string.Empty).ReplaceLineEndings("\n").Normalize(NormalizationForm.FormC).Trim();
}
