using Microsoft.AspNetCore.Identity;

namespace ChristianRent.Infrastructure.Identity;

/// <summary>
/// An account a person signs in with (ADR 0029): ASP.NET Core Identity's user, whose user name is
/// the email. It holds the email, a salted hash of the password, the security stamp and the
/// refusals with the lockout, and nothing else (L2-028, criterion 1). Its id is the <c>sub</c>
/// claim, which a member's <c>SignInId</c> holds.
/// </summary>
public sealed class Account : IdentityUser;
