using ChristianRent.Domain.Members;
using ChristianRent.Domain.Notices;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianRent.Infrastructure.Persistence;

internal sealed class ListingRemovalNoticeConfiguration : IEntityTypeConfiguration<ListingRemovalNotice>
{
    public void Configure(EntityTypeBuilder<ListingRemovalNotice> builder)
    {
        builder.ToTable("listing_removal_notices");
        builder.HasKey(notice => notice.Id);
        builder.Property(notice => notice.Id).ValueGeneratedNever();
        builder.Property(notice => notice.ListingId).IsRequired();
        builder.Property(notice => notice.CreatedAt).IsRequired();
        builder.HasOne<Member>().WithMany().HasForeignKey(notice => notice.MemberId).OnDelete(DeleteBehavior.Restrict);

        // A listing is removed once (ADR 0025).
        builder.HasIndex(notice => notice.ListingId).IsUnique();
    }
}
