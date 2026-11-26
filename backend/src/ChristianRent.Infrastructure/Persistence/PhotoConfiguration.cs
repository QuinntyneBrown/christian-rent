using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianRent.Infrastructure.Persistence;

internal sealed class PhotoConfiguration : IEntityTypeConfiguration<Photo>
{
    public void Configure(EntityTypeBuilder<Photo> builder)
    {
        builder.ToTable("photos");
        builder.HasKey(photo => photo.Id);
        builder.Property(photo => photo.Id).ValueGeneratedNever();
        builder.Property(photo => photo.UploadedAt).IsRequired();
        builder.HasOne<Member>().WithMany().HasForeignKey(photo => photo.OwnerId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Listing>().WithMany().HasForeignKey(photo => photo.ListingId).OnDelete(DeleteBehavior.Cascade);

        // purge-photos reads the unattached photos by age (ADR 0021).
        builder.HasIndex(photo => new { photo.ListingId, photo.UploadedAt });
    }
}
