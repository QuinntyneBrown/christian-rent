namespace ChristianRent.Infrastructure.Storage;

/// <summary>The <c>PhotoStorage</c> settings (README, Settings).</summary>
public sealed class PhotoStorageOptions
{
    public const string Section = "PhotoStorage";

    /// <summary>The directory photos are kept in; relative paths are under the content root.</summary>
    public string RootPath { get; set; } = "App_Data/photos";
}
