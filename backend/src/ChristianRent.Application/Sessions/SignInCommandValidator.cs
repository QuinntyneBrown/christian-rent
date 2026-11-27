using FluentValidation;

namespace ChristianRent.Application.Sessions;

/// <summary>
/// What a sign-in must carry before anything is checked (L2-026, criterion 2): an email of 1 to
/// 256 characters and a password of 1 to 1,024, so no one has a long text hashed.
/// </summary>
public sealed class SignInCommandValidator : AbstractValidator<SignInCommand>
{
    public const string EmailMessage = "Enter your email.";
    public const string PasswordMessage = "Enter your password.";

    public SignInCommandValidator()
    {
        RuleFor(command => command.Email).NotEmpty().MaximumLength(256).WithMessage(EmailMessage);
        RuleFor(command => command.Password).NotEmpty().MaximumLength(1024).WithMessage(PasswordMessage);
    }
}
