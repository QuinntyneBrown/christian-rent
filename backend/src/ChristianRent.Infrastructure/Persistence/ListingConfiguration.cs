using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianRent.Infrastructure.Persistence;

internal sealed class ListingConfiguration : IEntityTypeConfiguration<Listing>
{
    public void Configure(EntityTypeBuilder<Listing> builder)
    {
        builder.ToTable("listings");
        builder.HasKey(listing => listing.Id);
        builder.Property(listing => listing.Id).ValueGeneratedNever();
        builder.Property(listing => listing.Offer).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(listing => listing.Kind).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(listing => listing.Title).HasMaxLength(Listing.MaxTitleLength).IsRequired();
        builder.OwnsOne(listing => listing.Price, price =>
        {
            price.Property(value => value.Amount).HasColumnName("price_amount").HasPrecision(9, 2);
            price.Property(value => value.Period).HasColumnName("price_period").HasConversion<string>().HasMaxLength(16);
        });
        builder.Property(listing => listing.WhenText).HasMaxLength(Listing.MaxWhenTextLength);
        builder.Property(listing => listing.Area).HasMaxLength(Listing.MaxAreaLength).IsRequired();
        builder.Property(listing => listing.Note).HasMaxLength(Listing.MaxNoteLength);
        builder.Property(listing => listing.SearchText).HasMaxLength(Listing.MaxSearchTextLength).IsRequired();
        builder.Property(listing => listing.Status).HasConversion<string>().HasMaxLength(24).IsRequired();
        builder.Property(listing => listing.CreatedAt).IsRequired();
        builder.HasOne<Member>().WithMany().HasForeignKey(listing => listing.MemberId).OnDelete(DeleteBehavior.Restrict);

        builder.OwnsMany(listing => listing.Photos, photo =>
        {
            photo.ToTable("listing_photos");
            photo.WithOwner().HasForeignKey("ListingId");
            photo.HasKey("ListingId", nameof(ListingPhoto.PhotoId));
            photo.Property(value => value.PhotoId).ValueGeneratedNever();
            photo.Property(value => value.Description).HasMaxLength(ListingPhoto.MaxDescriptionLength);
            photo.HasIndex(value => value.PhotoId).IsUnique();
        });
        builder.Navigation(listing => listing.Photos).HasField("_photos");

        // Browse reads approved listings, most recently approved first, by keyset (ADR 0013).
        builder.HasIndex(listing => new { listing.Status, listing.ApprovedAt, listing.Id });

        // A search's Contains becomes a parameterised LIKE, which a trigram index serves (ADR 0015).
        builder.HasIndex(listing => listing.SearchText).HasMethod("gin").HasOperators("gin_trgm_ops");
    }
}
