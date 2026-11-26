using ChristianRent.Application.Abstractions;
using ChristianRent.Infrastructure.Persistence;
using ChristianRent.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// The database (ADR 0003), the photo storage (ADR 0004) and the clock. The connection string
    /// comes from configuration outside the repository (L2-027, criterion 4).
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Default")));
        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

        services.Configure<PhotoStorageOptions>(configuration.GetSection(PhotoStorageOptions.Section));
        services.AddSingleton<IPhotoStorage, LocalDiskPhotoStorage>();

        services.AddSingleton(TimeProvider.System);
        return services;
    }
}
