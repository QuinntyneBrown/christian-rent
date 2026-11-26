namespace ChristianRent.Domain.Listings;

/// <summary>
/// What a member posts: a space or a thing, for rent or wanted (L2-010). It waits in the review
/// queue until an admin approves it, and only then is it public (L2-001, criterion 2). The
/// post-listing journey adds how a member posts one.
/// </summary>
public sealed class Listing
{
    public const int MaxTitleLength = 80;
    public const int MaxWhenTextLength = 80;
    public const int MaxAreaLength = 80;
    public const int MaxNoteLength = 1000;

    /// <summary>The title, the note and the area, normalised, with a space between each.</summary>
    public const int MaxSearchTextLength = MaxTitleLength + MaxNoteLength + MaxAreaLength + 2;

    private readonly List<ListingPhoto> _photos = [];

    private Listing(
        Guid id,
        Guid memberId,
        ListingOffer offer,
        ListingKind kind,
        string title,
        string area,
        DateTimeOffset createdAt)
    {
        Id = id;
        MemberId = memberId;
        Offer = offer;
        Kind = kind;
        Title = title;
        Area = area;
        CreatedAt = createdAt;
        Status = ListingStatus.WaitingForReview;
        SearchText = string.Empty;
    }

    public Guid Id { get; private set; }

    public Guid MemberId { get; private set; }

    /// <summary>
    /// The identifier the browser gave the draft, so a repeated submission is the same listing
    /// (L2-012, criterion 4). Null for listings entered by seed data.
    /// </summary>
    public Guid? ClientRequestId { get; private set; }

    public ListingOffer Offer { get; private set; }

    public ListingKind Kind { get; private set; }

    public string Title { get; private set; }

    public Price? Price { get; private set; }

    /// <summary>"When" in words, for example "Weekday evenings"; or null when dates are given.</summary>
    public string? WhenText { get; private set; }

    public DateOnly? StartDate { get; private set; }

    public DateOnly? EndDate { get; private set; }

    /// <summary>A city or neighbourhood in Canada, never a street address (ADR 0012).</summary>
    public string Area { get; private set; }

    public string? Note { get; private set; }

    /// <summary>
    /// The normalised title, note and area that a search matches (L2-003; ADR 0015). The listing
    /// sets it whenever one of the three is set; nothing else writes it.
    /// </summary>
    public string SearchText { get; private set; }

    public ListingStatus Status { get; private set; }

    public DateTimeOffset CreatedAt { get; private set; }

    /// <summary>When an admin approved it; Browse shows the most recently approved first (ADR 0013).</summary>
    public DateTimeOffset? ApprovedAt { get; private set; }

    public IReadOnlyList<ListingPhoto> Photos => _photos;

    /// <summary>
    /// A listing with a known identifier, waiting for review, as seed data and tests enter them.
    /// "When" is either <paramref name="whenText"/> or the two dates.
    /// </summary>
    public static Listing Create(
        Guid id,
        Guid memberId,
        ListingOffer offer,
        ListingKind kind,
        string title,
        Price? price,
        string? whenText,
        DateOnly? startDate,
        DateOnly? endDate,
        string area,
        string? note,
        DateTimeOffset createdAt,
        IEnumerable<ListingPhoto>? photos = null)
    {
        var listing = new Listing(id, memberId, offer, kind, title, area, createdAt)
        {
            Price = price,
            WhenText = whenText,
            StartDate = startDate,
            EndDate = endDate,
            Note = note,
        };
        listing._photos.AddRange(photos ?? []);
        listing.RefreshSearchText();
        return listing;
    }

    /// <summary>
    /// A member posts a listing: it waits for review and is not public until an admin approves
    /// it (L2-012, criterion 1). Its photos are in the order given, the first on the card
    /// (L2-013, criterion 1). The fields have been checked by the command's validator.
    /// </summary>
    public static Listing Post(
        Guid memberId,
        Guid clientRequestId,
        ListingOffer offer,
        ListingKind kind,
        string title,
        Price? price,
        string? whenText,
        DateOnly? startDate,
        DateOnly? endDate,
        string area,
        string? note,
        DateTimeOffset now,
        IReadOnlyList<Guid>? photoIds = null)
    {
        var photos = (photoIds ?? []).Select((photoId, position) => ListingPhoto.Create(photoId, position, description: null));
        var listing = Create(Guid.NewGuid(), memberId, offer, kind, title, price, whenText, startDate, endDate, area, note, now, photos);
        listing.ClientRequestId = clientRequestId;
        return listing;
    }

    /// <summary>An admin lets the listing through the review queue; it becomes public.</summary>
    public void Approve(DateTimeOffset now)
    {
        Status = ListingStatus.Approved;
        ApprovedAt = now;
    }

    /// <summary>An admin removes the listing; it stops being public.</summary>
    public void Remove() => Status = ListingStatus.Removed;

    private void RefreshSearchText() =>
        SearchText = SearchNormalizer.Normalize(
            string.Join(' ', new[] { Title, Note, Area }.Where(text => !string.IsNullOrWhiteSpace(text))));
}
