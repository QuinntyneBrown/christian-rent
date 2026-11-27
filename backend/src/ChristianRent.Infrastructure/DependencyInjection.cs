using ChristianRent.Application.Abstractions;
using ChristianRent.Infrastructure.Identity;
using ChristianRent.Infrastructure.Notices;
using ChristianRent.Infrastructure.Persistence;
using ChristianRent.Infrastructure.Photos;
using ChristianRent.Infrastructure.Storage;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Infrastructure;

public static class DependencyInjection
{
    /// <summary>
    /// The database (ADR 0003), the photo storage (ADR 0004), the photo inspector and processor
    /// (ADR 0021) and the clock. The connection string
    /// comes from configuration outside the repository (L2-027, criterion 4).
    /// </summary>
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(configuration.GetConnectionString("Default")));
        services.AddScoped<IAppDbContext>(provider => provider.GetRequiredService<AppDbContext>());

        services.Configure<PhotoStorageOptions>(configuration.GetSection(PhotoStorageOptions.Section));
        services.AddSingleton<IPhotoStorage, LocalDiskPhotoStorage>();
        services.AddSingleton<IPhotoInspector, SkiaPhotoInspector>();
        services.AddSingleton<IPhotoProcessor, SkiaPhotoProcessor>();

        services.AddHttpContextAccessor();
        services.AddScoped<ICurrentMember, HttpCurrentMember>();
        services.AddScoped<IMemberNotifier, RecordedMemberNotifier>();
        services.AddScoped<Microsoft.AspNetCore.Authentication.IClaimsTransformation, MemberClaimsTransformation>();

        services.AddSingleton(TimeProvider.System);
        return services;
    }
}
