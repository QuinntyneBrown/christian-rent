namespace ChristianRent.Domain.Reports;

/// <summary>Why a member reports a listing: the fixed list of L2-021, criterion 1.</summary>
public enum ReportReason
{
    NotARealListing,
    Inappropriate,
    Scam,
    SomethingElse,
}
