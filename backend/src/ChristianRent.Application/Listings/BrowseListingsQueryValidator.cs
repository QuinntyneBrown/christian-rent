using FluentValidation;

namespace ChristianRent.Application.Listings;

/// <summary>
/// A page holds 1 to 50 listings (L2-030, criterion 3), and a cursor is one the API gave
/// (ADR 0013). Each refusal carries the code a client branches on.
/// </summary>
internal sealed class BrowseListingsQueryValidator : AbstractValidator<BrowseListingsQuery>
{
    public BrowseListingsQueryValidator()
    {
        RuleFor(query => query.Size)
            .InclusiveBetween(1, BrowseListingsQuery.MaxSize)
            .WithErrorCode("page_size_out_of_range")
            .WithMessage($"A page holds 1 to {BrowseListingsQuery.MaxSize} listings.");

        RuleFor(query => query.Cursor)
            .Must(cursor => cursor is null || ListingCursor.TryDecode(cursor, out _))
            .WithErrorCode("cursor_invalid")
            .WithMessage("The cursor is not one this API gave.");
    }
}
