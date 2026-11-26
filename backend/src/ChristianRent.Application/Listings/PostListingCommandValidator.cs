using ChristianRent.Application.Members;
using ChristianRent.Domain.Listings;
using FluentValidation;

namespace ChristianRent.Application.Listings;

/// <summary>
/// The rules of a listing, the same as Post applies (compose-listing and publish-listing
/// designs; L2-010, criterion 9): a client request; an offer and a kind; a title of 3 to 80
/// characters; a price of 0 to 100,000 with at most two decimals and its period, required for
/// rent; "when" as text of up to 80 characters or as two dates in order, never both; an area of
/// up to 80; a note of up to 1,000; and up to 6 photos, none on a wanted listing. One-line text
/// is counted as <see cref="MemberText"/> cleans it, the note trimmed. A failure is
/// <c>validation_failed</c>; a past start date is allowed (ADR 0019).
/// </summary>
public sealed class PostListingCommandValidator : AbstractValidator<PostListingCommand>
{
    public const int MinTitleLength = 3;
    public const int MaxPhotos = 6;

    public PostListingCommandValidator()
    {
        RuleFor(command => command.ClientRequestId)
            .Must(id => id is { } value && value != Guid.Empty).WithMessage("Send the draft's client request identifier.");

        RuleFor(command => command.Offer)
            .Must(offer => ListingWords.OfferOf(offer) is not null).WithMessage("Choose for-rent or wanted.");

        RuleFor(command => command.Kind)
            .Must(kind => ListingWords.KindOf(kind) is not null).WithMessage("Choose space or thing.");

        RuleFor(command => command.Title)
            .Must(title => MemberText.Clean(title).Length is >= MinTitleLength and <= Listing.MaxTitleLength)
            .WithMessage("A title is 3 to 80 characters.");

        RuleFor(command => command.PriceAmount)
            .NotNull().When(IsForRent).WithMessage("Enter a price. Enter 0 to offer it free.");
        RuleFor(command => command.PriceAmount)
            .Must(amount => amount is >= 0m and <= Price.Max && decimal.Round(amount.Value, 2) == amount.Value)
            .When(command => command.PriceAmount is not null)
            .WithMessage("A price is between $0 and $100,000, with at most two decimals.");

        RuleFor(command => command.PricePeriod)
            .Must(period => ListingWords.PeriodOf(period) is not null)
            .When(command => command.PriceAmount is not null)
            .WithMessage("Choose what the price is per: hour, day, week or month.");

        RuleFor(command => command.WhenText)
            .Must((command, text) => MemberText.Clean(text).Length > 0 || command.StartDate is not null || command.EndDate is not null)
            .WithMessage("Say when, in words or as a start and an end date.")
            .Must(text => MemberText.Clean(text).Length <= Listing.MaxWhenTextLength)
            .WithMessage("Describe when in 80 characters or fewer.")
            .Must((command, text) => MemberText.Clean(text).Length == 0 || (command.StartDate is null && command.EndDate is null))
            .WithMessage("Give when in words or as dates, not both.");

        When(command => MemberText.Clean(command.WhenText).Length == 0 && (command.StartDate is not null || command.EndDate is not null), () =>
        {
            RuleFor(command => command.StartDate).NotNull().WithMessage("Choose a start and an end date.");
            RuleFor(command => command.EndDate).NotNull().WithMessage("Choose a start and an end date.")
                .Must((command, end) => command.StartDate is null || end >= command.StartDate)
                .WithMessage("The end date is before the start date.");
        });

        RuleFor(command => command.Area)
            .Must(area => MemberText.Clean(area).Length is > 0 and <= Listing.MaxAreaLength)
            .WithMessage("Enter a city or neighbourhood in Canada, up to 80 characters.");

        RuleFor(command => command.Note)
            .Must(note => (note?.Trim().Length ?? 0) <= Listing.MaxNoteLength)
            .WithMessage("A note is 1,000 characters or fewer.");

        RuleFor(command => command.PhotoIds)
            .Must((command, photos) => IsForRent(command) ? (photos?.Count ?? 0) <= MaxPhotos : (photos?.Count ?? 0) == 0)
            .WithMessage("A listing for rent has up to 6 photos; a wanted listing has none.");
    }

    private static bool IsForRent(PostListingCommand command) =>
        ListingWords.OfferOf(command.Offer) == ListingOffer.ForRent;
}
