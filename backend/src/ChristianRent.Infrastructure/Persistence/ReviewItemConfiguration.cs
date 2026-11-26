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

        // The queue is read oldest first (L2-019, criterion 1).
        builder.HasIndex(item => item.CreatedAt);
    }
}
