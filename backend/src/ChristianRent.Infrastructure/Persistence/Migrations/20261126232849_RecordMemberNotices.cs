using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianRent.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RecordMemberNotices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "member_notices",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    Kind = table.Column<string>(type: "character varying(32)", maxLength: 32, nullable: false),
                    MemberId = table.Column<Guid>(type: "uuid", nullable: false),
                    ListingId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_member_notices", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_member_notices_MemberId",
                table: "member_notices",
                column: "MemberId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "member_notices");
        }
    }
}
