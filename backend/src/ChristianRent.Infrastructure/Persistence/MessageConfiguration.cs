using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Messages;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianRent.Infrastructure.Persistence;

internal sealed class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.ToTable("messages");
        builder.HasKey(message => message.Id);
        builder.Property(message => message.Id).ValueGeneratedNever();
        builder.Property(message => message.Text).HasMaxLength(Message.MaxTextLength).IsRequired();
        builder.Property(message => message.SentAt).IsRequired();

        // A message goes with its listing; a member is made anonymous, never deleted (ADR 0022).
        builder.HasOne<Listing>().WithMany().HasForeignKey(message => message.ListingId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Member>().WithMany().HasForeignKey(message => message.SenderId).OnDelete(DeleteBehavior.Restrict);
        builder.HasOne<Member>().WithMany().HasForeignKey(message => message.RecipientId).OnDelete(DeleteBehavior.Restrict);

        // The messaging limit counts a sender's messages of the last hour (L2-016, criterion 4).
        builder.HasIndex(message => new { message.SenderId, message.SentAt });

        // The inbox will read a member's received messages, newest first.
        builder.HasIndex(message => new { message.RecipientId, message.SentAt });
    }
}
