using ChristianRent.Domain.Churches;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianRent.Infrastructure.Persistence;

internal sealed class ChurchConfiguration : IEntityTypeConfiguration<Church>
{
    public void Configure(EntityTypeBuilder<Church> builder)
    {
        builder.ToTable("churches");
        builder.HasKey(church => church.Id);
        builder.Property(church => church.Id).ValueGeneratedNever();
        builder.Property(church => church.Name).HasMaxLength(Church.MaxNameLength).IsRequired();
        builder.Property(church => church.City).HasMaxLength(Church.MaxCityLength).IsRequired();
        builder.Property(church => church.IsVerified).IsRequired();

        // Not a foreign key: members already point at churches, and the purge keeps a departed
        // member's row (ADR 0024).
        builder.Property(church => church.EnteredById);

        // Not a foreign key either: who confirmed the church, and when (ADR 0031).
        builder.Property(church => church.VerifiedBy);
        builder.Property(church => church.VerifiedAt);
        builder.Property(church => church.MatchKey).HasMaxLength(ChurchMatch.MaxKeyLength).IsRequired();
        builder.HasIndex(church => church.MatchKey).IsUnique();
    }
}
