namespace ChristianRent.Domain.Churches;

/// <summary>
/// A church a member belongs to. It starts unverified; an admin confirms it (L2-018). A member
/// enters a new one when theirs is not listed (L2-017, criterion 2), and a church whose
/// <see cref="MatchKey"/> equals an existing one's is that church (ADR 0018).
/// </summary>
public sealed class Church
{
    public const int MaxNameLength = 100;
    public const int MaxCityLength = 80;

    private Church(Guid id, string name, string city, bool isVerified)
    {
        Id = id;
        Name = name;
        City = city;
        IsVerified = isVerified;
        MatchKey = ChurchMatch.KeyOf(name, city);
    }

    public Guid Id { get; private set; }

    public string Name { get; private set; }

    public string City { get; private set; }

    /// <summary>The name and city as <see cref="ChurchMatch"/> compares them; nothing else writes it.</summary>
    public string MatchKey { get; private set; }

    public bool IsVerified { get; private set; }

    /// <summary>A church with a known identifier, as seed data and tests enter them.</summary>
    public static Church Create(Guid id, string name, string city, bool isVerified) =>
        new(id, name, city, isVerified);

    /// <summary>A member enters their church; an admin has not confirmed it yet.</summary>
    public static Church Enter(string name, string city) =>
        new(Guid.NewGuid(), name, city, isVerified: false);
}
