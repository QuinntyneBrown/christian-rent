using ChristianRent.Api.Access;
using ChristianRent.Application.Listings;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ChristianRent.Api.Review;

/// <summary>
/// A photo as Admin's detail panel reads it, with the Admin session (L2-019, criterion 13; ADR
/// 0029). It sends the same request as <c>GET /api/photos/...</c>, whose handler decides what an
/// admin may read.
/// </summary>
[ApiController]
[Route("api/admin/photos")]
[Authorize(Policy = AccessExtensions.AdminPolicy)]
public sealed class AdminPhotosController(ISender sender) : ControllerBase
{
    [HttpGet("{id:guid}/{rendition}")]
    public async Task<FileStreamResult> Get(Guid id, string rendition, CancellationToken cancellationToken)
    {
        var photo = await sender.Send(new GetPhotoQuery(id, rendition), cancellationToken);
        Response.Headers.CacheControl = photo.CacheControl;
        return File(photo.Content, photo.ContentType);
    }
}
