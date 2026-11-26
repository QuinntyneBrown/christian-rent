using System.Text;

namespace ChristianRent.Application.Messages;

/// <summary>
/// A message's text made ready for its length check and for storing (ADR 0022): line endings
/// as <c>\n</c>, in Unicode form C, trimmed. Its line breaks are kept.
/// </summary>
public static class MessageText
{
    public static string Clean(string? text) =>
        (text ?? string.Empty).ReplaceLineEndings("\n").Normalize(NormalizationForm.FormC).Trim();
}
