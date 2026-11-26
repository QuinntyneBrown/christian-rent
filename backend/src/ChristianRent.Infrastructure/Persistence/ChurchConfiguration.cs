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
        builder.Property(church => church.MatchKey).HasMaxLength(ChurchMatch.MaxKeyLength).IsRequired();
        builder.HasIndex(church => church.MatchKey).IsUnique();

        // Who entered it, for the admin (ADR 0024). No foreign key: the church is saved with the
        // member who enters it, and a key each way would make that save circular.
        builder.Property(church => church.EnteredById);
    }
}
