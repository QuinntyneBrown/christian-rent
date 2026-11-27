using FluentValidation;

namespace ChristianRent.Application.Review;

internal sealed class GetReviewArrivalsQueryValidator : AbstractValidator<GetReviewArrivalsQuery>
{
    public GetReviewArrivalsQueryValidator()
    {
        RuleFor(query => query.Since)
            .Must(since => GetReviewArrivalsQuery.TryReadInstant(since, out _))
            .WithErrorCode("since_invalid")
            .WithMessage("The time is not one this API gave.");
    }
}
