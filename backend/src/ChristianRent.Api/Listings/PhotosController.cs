using ChristianRent.Application.Listings;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Listings;

[ApiController]
[Route("api/photos")]
public sealed class PhotosController(ISender sender) : ControllerBase
{
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
