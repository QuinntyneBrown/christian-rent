namespace ChristianRent.Domain.Review;

/// <summary>A review item that has a decision was decided again (L2-020, criterion 5).</summary>
public sealed class AlreadyDecidedException() : InvalidOperationException("The review item is already decided.");
