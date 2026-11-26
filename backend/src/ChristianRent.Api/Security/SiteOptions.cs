namespace ChristianRent.Api.Security;

/// <summary>The <c>Site</c> settings (README, Settings).</summary>
public sealed class SiteOptions
{
    public const string Section = "Site";

    /// <summary>The origin the frontend is served from, e.g. https://christian.rent.</summary>
    public string Origin { get; set; } = "";
}
