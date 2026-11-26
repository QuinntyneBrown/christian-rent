using ChristianRent.Domain.Listings;
using ChristianRent.Domain.Members;
using ChristianRent.Domain.Reports;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace ChristianRent.Infrastructure.Persistence;

internal sealed class ReportConfiguration : IEntityTypeConfiguration<Report>
{
    public void Configure(EntityTypeBuilder<Report> builder)
    {
        builder.ToTable("reports");
        builder.HasKey(report => report.Id);
        builder.Property(report => report.Id).ValueGeneratedNever();
        builder.Property(report => report.Reason).HasConversion<string>().HasMaxLength(24).IsRequired();
        builder.Property(report => report.Note).HasMaxLength(Report.MaxNoteLength);
        builder.Property(report => report.Status).HasConversion<string>().HasMaxLength(16).IsRequired();
        builder.Property(report => report.CreatedAt).IsRequired();

        // A report goes with its listing; a member is made anonymous, never deleted (ADR 0023).
        builder.HasOne<Listing>().WithMany().HasForeignKey(report => report.ListingId).OnDelete(DeleteBehavior.Cascade);
        builder.HasOne<Member>().WithMany().HasForeignKey(report => report.ReporterId).OnDelete(DeleteBehavior.Restrict);

        // One report for each member and listing (L2-021, criterion 3).
        builder.HasIndex(report => new { report.ListingId, report.ReporterId }).IsUnique();
    }
}
