using ChristianRent.Application.Abstractions;
using ChristianRent.Application.Errors;
using ChristianRent.Application.Listings;
using ChristianRent.Domain.Messages;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace ChristianRent.Application.Messages;

/// <summary>
/// Stores a member's message for the sender and the member who posted the listing (L2-015,
/// criterion 1; L2-016, criterion 1). It writes nothing to the listing (L2-024, criterion 3),
/// and nothing is sent anywhere else: the message waits for the Messages inbox (ADR 0022). The
/// validator has checked the text and the dates.
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

        var now = clock.GetUtcNow();
        var message = Message.Send(listing, senderId, MessageText.Clean(command.Text), command.StartDate, command.EndDate, now);
        database.Messages.Add(message);
        await database.SaveChangesAsync(cancellationToken);
        return new SentMessageDto(message.Id, message.SentAt);
    }
}
