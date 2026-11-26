using ChristianRent.Application.Listings;
using ChristianRent.Application.Photos;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Listings;

[ApiController]
[Route("api/photos")]
public sealed class PhotosController(ISender sender) : ControllerBase
{
    /// <summary>The largest photo (10 MB) and room for the form around it (ADR 0021).</summary>
    private const long UploadLimit = (10 * 1024 * 1024) + (64 * 1024);

    /// <summary>
    /// A member uploads a photo, one multipart field named <c>file</c> (add-photos design). The
    /// handler checks membership and the photo itself; a body over the limit is answered 413.
    /// </summary>
    [HttpPost]
    [RequestSizeLimit(UploadLimit)]
    [RequestFormLimits(MultipartBodyLengthLimit = UploadLimit)]
    public async Task<IActionResult> Upload(IFormFile? file, CancellationToken cancellationToken)
    {
        await using var content = file?.OpenReadStream() ?? Stream.Null;
        var photo = await sender.Send(new UploadPhotoCommand(content, file?.Length ?? 0), cancellationToken);
        return Created($"/api/photos/{photo.Id}", photo);
    }

    /// <summary>
    /// A rendition of a photo. Anyone may read an approved listing's photo, as Browse shows it;
    /// the handler answers not_found for anything else (ADR 0011).
    /// </summary>
    [HttpGet("{id:guid}/{rendition}")]
    [AllowAnonymous]
    public async Task<FileStreamResult> Get(Guid id, string rendition, CancellationToken cancellationToken)
    {
        var photo = await sender.Send(new GetPhotoQuery(id, rendition), cancellationToken);
        Response.Headers.CacheControl = photo.CacheControl;
        return File(photo.Content, photo.ContentType);
    }
}
