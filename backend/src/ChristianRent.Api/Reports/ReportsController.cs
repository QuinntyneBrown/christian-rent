using ChristianRent.Application.Reports;
using MediatR;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Reports;

[ApiController]
[Route("api/listings/{listingId}/reports")]
public sealed class ReportsController(ISender sender) : ControllerBase
{
    /// <summary>
    /// A member reports a listing (L2-021): 201 with when the report was filed, and nothing else.
    /// Membership and the listing are checked by the handler.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> Report(string listingId, ReportListingRequest request, CancellationToken cancellationToken)
    {
        var reported = await sender.Send(new ReportListingCommand(listingId, request.Reason, request.Note), cancellationToken);
        return StatusCode(StatusCodes.Status201Created, reported);
    }
}
