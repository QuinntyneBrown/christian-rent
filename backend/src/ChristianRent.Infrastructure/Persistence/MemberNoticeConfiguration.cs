using ChristianRent.Domain.Notices;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianRent.Infrastructure.Persistence;

internal sealed class MemberNoticeConfiguration : IEntityTypeConfiguration<MemberNotice>
{
    public void Configure(EntityTypeBuilder<MemberNotice> builder)
    {
        builder.ToTable("member_notices");
        builder.HasKey(notice => notice.Id);
        builder.Property(notice => notice.Id).ValueGeneratedNever();
        builder.Property(notice => notice.Kind).HasConversion<string>().HasMaxLength(32).IsRequired();
        builder.Property(notice => notice.MemberId).IsRequired();
        builder.Property(notice => notice.ListingId).IsRequired();
        builder.Property(notice => notice.CreatedAt).IsRequired();

        // The inbox, when designed, reads a member's notices (ADR 0025).
        builder.HasIndex(notice => notice.MemberId);
    }
}
