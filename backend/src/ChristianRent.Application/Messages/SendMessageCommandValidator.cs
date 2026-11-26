using ChristianRent.Domain.Messages;
using FluentValidation;

namespace ChristianRent.Application.Messages;

/// <summary>
/// The rules of a message, the same as the message box applies (send-message design; L2-015,
/// criteria 3 and 4; ADR 0022): text of 1 to 1,000 characters as <see cref="MessageText"/>
/// cleans it, with no control character other than a line break or a tab; and dates that are
/// optional, but both or neither, in order, and not in the past. The backend's date is UTC and
/// every Canadian time zone is behind it, so a start on the day before is still today for the
/// member and is accepted. A failure is <c>validation_failed</c>.
/// </summary>
public sealed class SendMessageCommandValidator : AbstractValidator<SendMessageCommand>
{
    public const string TextMessage = "Write a message of 1 to 1,000 characters.";

    public SendMessageCommandValidator(TimeProvider clock)
    {
        RuleFor(command => command.Text)
            .Must(text => MessageText.Clean(text).Length is >= 1 and <= Message.MaxTextLength)
            .WithMessage(TextMessage)
            .Must(text => !MessageText.Clean(text).Any(character => char.IsControl(character) && character is not ('\n' or '\t')))
            .WithMessage("A message has no control characters.");

        When(command => command.StartDate is not null || command.EndDate is not null, () =>
        {
            RuleFor(command => command.StartDate)
                .NotNull().WithMessage("Choose a start and an end date.")
                .Must(start => start is null || start >= DateOnly.FromDateTime(clock.GetUtcNow().UtcDateTime).AddDays(-1))
                .WithMessage("The start date is in the past.");
            RuleFor(command => command.EndDate)
                .NotNull().WithMessage("Choose a start and an end date.")
                .Must((command, end) => end is null || command.StartDate is null || end >= command.StartDate)
                .WithMessage("The end date is before the start date.");
        });
    }
}
