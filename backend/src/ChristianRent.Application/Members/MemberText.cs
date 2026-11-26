using System.Text;

namespace ChristianRent.Application.Members;

/// <summary>
/// What a member types into a one-line field, made ready for its length check: trimmed, with
/// runs of white space made one space, in Unicode form C (handle-member-data design).
/// </summary>
public static class MemberText
{
    public static string Clean(string? text) =>
        string.Join(' ', (text ?? string.Empty).Normalize(NormalizationForm.FormC)
            .Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
}
