using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianRent.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RecordListingRemovalNotices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "listing_removal_notices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    ListingId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_listing_removal_notices", x => x.Id);
                    table.ForeignKey(
                        name: "FK_listing_removal_notices_members_MemberId",
                        column: x => x.MemberId,
                        principalTable: "members",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_listing_removal_notices_ListingId",
                table: "listing_removal_notices",
                column: "ListingId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_listing_removal_notices_MemberId",
                table: "listing_removal_notices",
                column: "MemberId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "listing_removal_notices");
        }
    }
}
