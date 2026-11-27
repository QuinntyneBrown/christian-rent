using ChristianRent.Api.Errors;
using ChristianRent.Infrastructure.Identity;
using Microsoft.Extensions.Options;

namespace ChristianRent.Api.Security;

/// <summary>
/// Refuses a data-changing request from another site with 403 <c>cross_site_request</c>
/// (L2-027, criteria 2 and 5; ADR 0029): one whose <c>Sec-Fetch-Site</c> is not
/// <c>same-origin</c> or <c>none</c>, and one whose <c>Origin</c>, when sent, is not the origin of
/// the application the path belongs to: Admin's for <c>/api/admin/</c>, `rent`'s for any other.
/// Signing in and out are covered, so nobody is signed in to an account they did not choose. A
/// request with neither header did not come from a browser page, which is what the guard
/// protects against.
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
        if (fetchSite.Length > 0 && fetchSite is not ("same-origin" or "none"))
        {
            return true;
        }

        var origin = request.Headers.Origin.ToString();
        var expected = SessionSchemes.IsAdminPath(request.Path) ? site.Value.AdminOrigin : site.Value.Origin;
        return origin.Length > 0 && !string.Equals(origin, expected.TrimEnd('/'), StringComparison.OrdinalIgnoreCase);
    }
}
