using FluentValidation;
using MediatR;

namespace ChristianRent.Application.Review;

/// <summary>
/// One page of the review queue, oldest first (L2-019). <see cref="Cursor"/> is the
/// <c>nextCursor</c> of the page before; a page holds <see cref="Size"/> items (ADR 0024).
/// </summary>
public sealed record GetReviewQueueQuery(string? Cursor) : IRequest<ReviewQueuePageDto>
{
    public const int Size = 50;
}

/// <summary>A cursor is one the API gave (ADR 0013).</summary>
internal sealed class GetReviewQueueQueryValidator : AbstractValidator<GetReviewQueueQuery>
{
    public GetReviewQueueQueryValidator()
    {
        RuleFor(query => query.Cursor)
            .Must(cursor => cursor is null || ReviewCursor.TryDecode(cursor, out _))
            .WithErrorCode("cursor_invalid")
            .WithMessage("The cursor is not one this API gave.");
    }
}
