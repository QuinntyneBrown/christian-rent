using ChristianRent.Application.Behaviors;
using FluentValidation;
using Microsoft.Extensions.DependencyInjection;

namespace ChristianRent.Application;

public static class DependencyInjection
{
    /// <summary>MediatR handlers, their validators, and the validation behaviour that runs first.</summary>
    public static IServiceCollection AddApplication(this IServiceCollection services)
    {
        services.AddMediatR(configuration =>
        {
            configuration.RegisterServicesFromAssemblyContaining<ValidationBehaviorMarker>();
            configuration.AddOpenBehavior(typeof(ValidationBehavior<,>));
        });
        services.AddValidatorsFromAssemblyContaining<ValidationBehaviorMarker>(includeInternalTypes: true);
        return services;
    }
}
