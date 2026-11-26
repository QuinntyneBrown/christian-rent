using ChristianRent.Application.Paging;
using FluentValidation;

namespace ChristianRent.Application.Review;

/// <summary>A page holds 1 to 50 review items (L2-030, criterion 3), and a cursor is one the API gave.</summary>
internal sealed class GetReviewQueueQueryValidator : AbstractValidator<GetReviewQueueQuery>
{
    public GetReviewQueueQueryValidator()
    {
        RuleFor(query => query.Size)
            .InclusiveBetween(1, GetReviewQueueQuery.MaxSize)
            .WithErrorCode("page_size_out_of_range")
            .WithMessage($"A page holds 1 to {GetReviewQueueQuery.MaxSize} review items.");

        RuleFor(query => query.Cursor)
            .Must(cursor => cursor is null || KeysetCursor.TryDecode(cursor, out _))
            .WithErrorCode("cursor_invalid")
            .WithMessage("The cursor is not one this API gave.");
    }
}
