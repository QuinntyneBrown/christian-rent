using ChristianRent.Domain.Reports;
using FluentValidation;

namespace ChristianRent.Application.Reports;

/// <summary>
/// The rules of a report, the same as the dialog applies (report-listing design; L2-021,
/// criteria 1 and 7; ADR 0023): a reason from the fixed list, and an optional note of up to 500
/// characters as <see cref="ReportText"/> cleans it, with no control character other than a
/// line break or a tab. A failure is <c>validation_failed</c>.
/// </summary>
public sealed class ReportListingCommandValidator : AbstractValidator<ReportListingCommand>
{
    public ReportListingCommandValidator()
    {
        RuleFor(command => command.Reason)
            .Must(reason => ReportWords.ReasonOf(reason) is not null)
            .WithMessage("Choose a reason.");

        RuleFor(command => command.Note)
            .Must(note => ReportText.Clean(note).Length <= Report.MaxNoteLength)
            .WithMessage("A note is 500 characters or fewer.")
            .Must(note => !ReportText.Clean(note).Any(character => char.IsControl(character) && character is not ('\n' or '\t')))
            .WithMessage("A note has no control characters.");
    }
}
