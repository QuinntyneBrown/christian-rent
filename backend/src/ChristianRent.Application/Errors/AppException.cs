namespace ChristianRent.Application.Errors;

/// <summary>
/// A refusal a client branches on. <c>ProblemExceptionHandler</c> turns each kind into a
/// ProblemDetails with this <see cref="Code"/> (L2-025, criterion 4).
/// </summary>
public abstract class AppException(string code, string message) : Exception(message)
{
    public string Code { get; } = code;
}

/// <summary>Missing, or not the caller's to see: the two are answered alike (L2-025, criterion 2).</summary>
public sealed class NotFoundException() : AppException("not_found", "Not found.");

/// <summary>The caller may not do this; the code says why (not_a_member, not_an_admin, own_listing).</summary>
public sealed class ForbiddenException(string code) : AppException(code, "Forbidden.");

/// <summary>
/// The member reported this listing before, at <see cref="ReportedAt"/>; nothing more is filed
/// (L2-021, criterion 3).
/// </summary>
public sealed class AlreadyReportedException(DateTimeOffset reportedAt) : AppException("already_reported", "Conflict.")
{
    public DateTimeOffset ReportedAt { get; } = reportedAt;
}

/// <summary>
/// The review item has a decision, which stands (L2-020, criteria 5 and 13): which one, when,
/// and whether it was the caller's own. It names no admin (ADR 0026).
/// </summary>
public sealed class ReviewItemDecidedException(string decision, DateTimeOffset decidedAt, bool decidedByYou)
    : AppException("already_decided", "Conflict.")
{
    public string Decision { get; } = decision;

    public DateTimeOffset DecidedAt { get; } = decidedAt;

    public bool DecidedByYou { get; } = decidedByYou;
}

/// <summary>The action was already taken (already_decided, decision_not_allowed).</summary>
public sealed class ConflictException(string code) : AppException(code, "Conflict.");

/// <summary>A limit is reached until <see cref="RetryAt"/> (post_limit_reached, message_limit_reached).</summary>
public sealed class LimitReachedException(string code, DateTimeOffset retryAt) : AppException(code, "Limit reached.")
{
    public DateTimeOffset RetryAt { get; } = retryAt;
}
