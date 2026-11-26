using MediatR;

namespace ChristianRent.Application.Listings;

/// <summary>One rendition of a photo, for whoever may see it (ADR 0011, ADR 0021).</summary>
public sealed record GetPhotoQuery(Guid PhotoId, string Rendition) : IRequest<PhotoFile>;

/// <summary>A rendition to stream, with the <c>Cache-Control</c> it is served with.</summary>
public sealed record PhotoFile(Stream Content, string ContentType, string CacheControl);
