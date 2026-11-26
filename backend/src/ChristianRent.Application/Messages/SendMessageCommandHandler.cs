using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using ChristianRent.Application.Listings;
using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Messages;
using FluentValidation;
using FluentValidation.Results;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Messages;

/// <summary>
/// Stores a member's message for the sender and the member who posted the listing (L2-015,
/// criterion 1; L2-016, criterion 1). It writes nothing to the listing (L2-024, criterion 3),
/// and nothing is sent anywhere else: the message waits for the Messages inbox (ADR 0022). A
/// listing that is not public is answered like one that does not exist, to anyone (L2-016,
/// criterion 5); the listing's own poster is refused (L2-015, criterion 6); and a member who has
/// sent 20 in an hour is refused until <see cref="MessagingLimit"/> reopens (L2-016, criterion
/// 4). The validator has checked the text and the dates.
/// </summary>
internal sealed class SendMessageCommandHandler(IAppDbContext database, ICurrentMember caller, TimeProvider clock)
    : IRequestHandler<SendMessageCommand, SentMessageDto>
{
    public async Task<SentMessageDto> Handle(SendMessageCommand command, CancellationToken cancellationToken)
    {
        var senderId = caller.RequireMember();

        var listing = Guid.TryParse(command.ListingId, out var listingId)
            ? await PublicListings.Of(database).AsNoTracking().FirstOrDefaultAsync(found => found.Id == listingId, cancellationToken)
            : null;
        if (listing is null)
        {
            throw new NotFoundException();
        }

        if (listing.MemberId == senderId)
        {
            throw new ForbiddenException("own_listing");
        }

        if (listing.Offer == ListingOffer.Wanted && (command.StartDate is not null || command.EndDate is not null))
        {
            throw new ValidationException([new ValidationFailure(nameof(SendMessageCommand.StartDate), DatesOnWantedMessage)]);
        }

        var now = clock.GetUtcNow();
        var since = now - MessagingLimit.Window;
        var recent = await database.Messages.AsNoTracking()
            .Where(sent => sent.SenderId == senderId && sent.SentAt > since)
            .Select(sent => sent.SentAt)
            .ToListAsync(cancellationToken);
        if (MessagingLimit.RetryAt(recent, now) is { } retryAt)
        {
            throw new LimitReachedException("message_limit_reached", retryAt);
        }

        var message = Message.Send(listing, senderId, MessageText.Clean(command.Text), command.StartDate, command.EndDate, now);
        database.Messages.Add(message);
        await database.SaveChangesAsync(cancellationToken);
        return new SentMessageDto(message.Id, message.SentAt);
    }

    public const string DatesOnWantedMessage = "A message about a wanted listing has no dates.";
}
