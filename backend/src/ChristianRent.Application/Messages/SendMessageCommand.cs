using MediatR;

namespace ChristianRent.Application.Messages;

/// <summary>
/// A member sends a message about a listing to the member who posted it, with dates when the
/// listing is for rent (send-message design). <see cref="ListingId"/> is the address's text, so
/// one that is not an identifier is answered like an unknown listing.
/// </summary>
public sealed record SendMessageCommand(string ListingId, string? Text, DateOnly? StartDate, DateOnly? EndDate)
    : IRequest<SentMessageDto>;

/// <summary>What the request's body carries; the listing comes from the address.</summary>
public sealed record SendMessageRequest(string? Text, DateOnly? StartDate, DateOnly? EndDate);

/// <summary>
/// What the API answers about a sent message: that it exists, and never its text. Reading a
/// message waits for the Messages inbox (ADR 0022).
/// </summary>
public sealed record SentMessageDto(Guid Id, DateTimeOffset SentAt);
