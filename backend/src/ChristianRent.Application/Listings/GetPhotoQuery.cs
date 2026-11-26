using MediatR;

namespace ChristianRent.Application.Listings;

/// <summary>One rendition of a photo, for anyone when its listing is public (ADR 0011).</summary>
public sealed record GetPhotoQuery(Guid PhotoId, string Rendition) : IRequest<PhotoFile>;

/// <summary>A rendition to stream, with the <c>Cache-Control</c> it is served with.</summary>
public sealed record PhotoFile(Stream Content, string ContentType, string CacheControl);
