using ChristianRent.Application.Abstractions;
using ChristianRent.Infrastructure.Persistence;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Time.Testing;

namespace ChristianRent.Api.Tests.Support;

/// <summary>
/// The API under test (ADR 0007): EF Core InMemory with one store per fixture, a fake clock, a
/// fake photo storage, and no real network. Each test class gets its own factory.
/// </summary>
public class ApiFactory : WebApplicationFactory<Program>
{
    public const string SiteOrigin = "https://christian.rent";

    private readonly string _databaseName = $"christian-rent-{Guid.NewGuid()}";

    public FakeTimeProvider Clock { get; } = new(new DateTimeOffset(2026, 6, 8, 15, 0, 0, TimeSpan.Zero));

    public FakePhotoStorage PhotoStorage { get; } = new();

    /// <summary>The ASP.NET Core environment; anything but Development turns on HTTPS and HSTS.</summary>
    protected virtual string EnvironmentName => "Testing";

    /// <summary>An HTTPS client, as browsers reach the deployed API.</summary>
    public HttpClient CreateHttpsClient() =>
        CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false,
        });

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment(EnvironmentName);
        builder.UseSetting("ConnectionStrings:Default", "Host=not-used-by-tests");
        builder.UseSetting("Site:Origin", SiteOrigin);
        builder.UseSetting("https_port", "443");

        builder.ConfigureTestServices(services =>
        {
            services.RemoveAll<DbContextOptions<AppDbContext>>();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(options => options.UseInMemoryDatabase(_databaseName));

            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Clock);

            services.RemoveAll<IPhotoStorage>();
            services.AddSingleton<IPhotoStorage>(PhotoStorage);

            ConfigureTestServices(services);
        });
    }

    /// <summary>A test class adds its own services here.</summary>
    protected virtual void ConfigureTestServices(IServiceCollection services)
    {
    }
}
