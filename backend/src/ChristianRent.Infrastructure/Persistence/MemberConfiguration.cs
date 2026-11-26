using ChristianRent.Domain.Churches;
using ChristianRent.Domain.Members;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianRent.Infrastructure.Persistence;

internal sealed class MemberConfiguration : IEntityTypeConfiguration<Member>
{
    public void Configure(EntityTypeBuilder<Member> builder)
    {
        builder.ToTable("members");
        builder.HasKey(member => member.Id);
        builder.Property(member => member.Id).ValueGeneratedNever();
        builder.Property(member => member.Name).HasMaxLength(Member.MaxNameLength).IsRequired();
        builder.Property(member => member.IsVerified).IsRequired();
        builder.Property(member => member.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(member => member.JoinedAt).IsRequired();
        builder.HasOne<Church>().WithMany().HasForeignKey(member => member.ChurchId).OnDelete(DeleteBehavior.Restrict);
    }
}
