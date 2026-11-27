namespace ChristianRent.Api.Security;

/// <summary>The <c>Site</c> settings (README, Settings; ADR 0028).</summary>
public sealed class SiteOptions
{
    public const string Section = "Site";

    /// <summary>The origin `rent` is served from, e.g. https://christian.rent.</summary>
    public string Origin { get; set; } = "";

    /// <summary>The origin Admin is served from, e.g. https://admin.christian.rent.</summary>
    public string AdminOrigin { get; set; } = "";
}
