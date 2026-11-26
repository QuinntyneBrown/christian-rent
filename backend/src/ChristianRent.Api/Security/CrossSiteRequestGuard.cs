using ChristianRent.Api.Errors;
using Microsoft.Extensions.Options;

namespace ChristianRent.Api.Security;

/// <summary>
/// Refuses a data-changing request from another site with 403 <c>cross_site_request</c>
/// (L2-027, criterion 2). It reads <c>Sec-Fetch-Site</c> when the browser sends it, and otherwise
/// compares <c>Origin</c> with the configured site origin. A request with neither did not come
/// from a browser page, which is what the guard protects against.
/// </summary>
internal sealed class CrossSiteRequestGuard(RequestDelegate next, IOptions<SiteOptions> site)
{
    public async Task InvokeAsync(HttpContext context)
    {
        if (ChangesData(context.Request.Method) && FromAnotherSite(context.Request))
        {
            await Problems.WriteAsync(context, Problems.Create(StatusCodes.Status403Forbidden, "cross_site_request", "Not allowed"));
            return;
        }

        await next(context);
    }

    private static bool ChangesData(string method) =>
        !(HttpMethods.IsGet(method) || HttpMethods.IsHead(method) || HttpMethods.IsOptions(method) || HttpMethods.IsTrace(method));

    private bool FromAnotherSite(HttpRequest request)
    {
        var fetchSite = request.Headers["Sec-Fetch-Site"].ToString();
        if (fetchSite.Length > 0)
        {
            return fetchSite is not ("same-origin" or "none");
        }

        var origin = request.Headers.Origin.ToString();
        return origin.Length > 0 && !string.Equals(origin, site.Value.Origin.TrimEnd('/'), StringComparison.OrdinalIgnoreCase);
    }
}
