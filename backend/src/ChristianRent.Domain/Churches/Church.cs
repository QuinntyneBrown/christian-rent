namespace ChristianRent.Domain.Churches;

/// <summary>
/// A church a member belongs to. It starts unverified; an admin confirms it (L2-018). The
/// become-member journey adds how a church is entered and matched.
/// </summary>
public sealed class Church
{
    public const int MaxNameLength = 120;
    public const int MaxCityLength = 80;

    private Church(Guid id, string name, string city, bool isVerified)
    {
        Id = id;
        Name = name;
        City = city;
        IsVerified = isVerified;
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; }

    public string City { get; private set; }

    public bool IsVerified { get; private set; }

    /// <summary>A church with a known identifier, as seed data and tests enter them.</summary>
    public static Church Create(Guid id, string name, string city, bool isVerified) =>
        new(id, name, city, isVerified);
}
