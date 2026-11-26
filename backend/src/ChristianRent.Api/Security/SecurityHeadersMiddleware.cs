namespace ChristianRent.Api.Security;

/// <summary>
/// Adds the Content-Security-Policy and the other security headers to every response
/// (handle-member-data design; L2-026, criterion 3). <c>script-src 'self'</c> allows no inline
/// and no third-party script. <c>style-src</c> allows inline styles until a host can issue a
/// nonce for Angular's component styles (handle-member-data, Undecided).
/// </summary>
internal sealed class SecurityHeadersMiddleware(RequestDelegate next)
{
    public const string ContentSecurityPolicy =
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob:; " +
        "font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'";

    public Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers.ContentSecurityPolicy = ContentSecurityPolicy;
            headers.XContentTypeOptions = "nosniff";
            headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
            return Task.CompletedTask;
        });
        return next(context);
    }
}
