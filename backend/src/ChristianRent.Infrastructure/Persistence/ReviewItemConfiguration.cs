using ChristianRent.Domain.Review;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianRent.Infrastructure.Persistence;

internal sealed class ReviewItemConfiguration : IEntityTypeConfiguration<ReviewItem>
{
    public void Configure(EntityTypeBuilder<ReviewItem> builder)
    {
        builder.ToTable("review_items");
        builder.HasKey(item => item.Id);
        builder.Property(item => item.Id).ValueGeneratedNever();
        builder.Property(item => item.Kind).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(item => item.SubjectId).IsRequired();
        builder.Property(item => item.CreatedAt).IsRequired();
        builder.Property(item => item.Decision).HasConversion<string>().HasMaxLength(16);
        builder.Property(item => item.DecidedById);
        builder.Property(item => item.DecidedAt);

        // Of two admins deciding the same item, the second's save fails (ADR 0025).
        builder.Property(item => item.Version).IsConcurrencyToken();
        builder.Ignore(item => item.Decisions);

        // The queue is read oldest first (L2-019, criterion 1).
        builder.HasIndex(item => item.CreatedAt);
    }
}
