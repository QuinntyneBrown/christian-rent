using ChristianRent.Application.Messages;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Messages;

[ApiController]
[Route("api/listings/{listingId}/messages")]
public sealed class MessagesController(ISender sender) : ControllerBase
{
    /// <summary>
    /// A member sends a message about a listing to the member who posted it (L2-015): 201 with
    /// the message's identifier and when it was sent, never its text. Membership, the listing
    /// and the messaging limit are checked by the handler.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Send(string listingId, SendMessageRequest request, CancellationToken cancellationToken)
    {
        var sent = await sender.Send(
            new SendMessageCommand(listingId, request.Text, request.StartDate, request.EndDate), cancellationToken);
        return StatusCode(StatusCodes.Status201Created, sent);
    }
}
