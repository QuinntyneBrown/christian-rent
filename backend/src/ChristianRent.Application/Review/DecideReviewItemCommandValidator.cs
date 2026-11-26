using FluentValidation;

namespace ChristianRent.Application.Review;

/// <summary>A decision names one of the three words.</summary>
internal sealed class DecideReviewItemCommandValidator : AbstractValidator<DecideReviewItemCommand>
{
    public DecideReviewItemCommandValidator()
    {
        RuleFor(command => command.Decision)
            .Must(decision => ReviewWords.DecisionOf(decision) is not null)
            .WithMessage("Choose approve, keep or remove.");
    }
}
