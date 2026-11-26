using FluentValidation;
using MediatR;

namespace ChristianRent.Application.Behaviors;

/// <summary>
/// Runs every validator of a request before its handler and refuses with
/// <see cref="ValidationException"/> when one fails (L2-026, criterion 2).
/// </summary>
public sealed class ValidationBehavior<TRequest, TResponse>(IEnumerable<IValidator<TRequest>> validators)
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var failures = new List<FluentValidation.Results.ValidationFailure>();
        foreach (var validator in validators)
        {
            var result = await validator.ValidateAsync(request, cancellationToken);
            failures.AddRange(result.Errors);
        }

        if (failures.Count > 0)
        {
            throw new ValidationException(failures);
        }

        return await next(cancellationToken);
    }
}

/// <summary>Marks this assembly for registration.</summary>
internal sealed class ValidationBehaviorMarker;
