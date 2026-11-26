using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Members;
using FluentValidation;

namespace ChristianRent.Application.Members;

/// <summary>
/// The rules of joining (L2-017, criteria 1, 2 and 6; ADR 0018): a name of 1 to 60 characters;
/// a chosen church, or a new one with a name of 1 to 100 and a city of 1 to 80, never both; and
/// the declaration. Lengths count the text as <see cref="MemberText"/> cleans it. Each message is
/// the one the join dialog shows.
/// </summary>
public sealed class JoinCommandValidator : AbstractValidator<JoinCommand>
{
    public const string NameMessage = "Enter your name, up to 60 characters.";
    public const string ChurchMessage = "Choose your church, or choose “My church isn’t listed”.";
    public const string NewChurchNameMessage = "Enter your church’s name, up to 100 characters.";
    public const string NewChurchCityMessage = "Enter your church’s city, up to 80 characters.";
    public const string DeclarationMessage = "Tick the box to declare that you are a Christian.";

    public JoinCommandValidator()
    {
        RuleFor(command => command.Name)
            .Must(name => Within(name, Member.MaxNameLength)).WithMessage(NameMessage);

        RuleFor(command => command.ChurchId)
            .Must((command, churchId) => churchId is not null != NewChurchIsGiven(command))
            .WithMessage(ChurchMessage);

        When(command => command.ChurchId is null && NewChurchIsGiven(command), () =>
        {
            RuleFor(command => command.NewChurchName)
                .Must(name => Within(name, Church.MaxNameLength)).WithMessage(NewChurchNameMessage);
            RuleFor(command => command.NewChurchCity)
                .Must(city => Within(city, Church.MaxCityLength)).WithMessage(NewChurchCityMessage);
        });

        RuleFor(command => command.DeclaresChristian)
            .Equal(true).WithMessage(DeclarationMessage);
    }

    /// <summary>Whether anything of a new church was typed, its name or its city.</summary>
    private static bool NewChurchIsGiven(JoinCommand command) =>
        MemberText.Clean(command.NewChurchName).Length > 0 || MemberText.Clean(command.NewChurchCity).Length > 0;

    private static bool Within(string? text, int maxLength)
    {
        var length = MemberText.Clean(text).Length;
        return length > 0 && length <= maxLength;
    }
}
