using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianRent.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RecordReviewDecisions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "DecidedAt",
                table: "review_items",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "DecidedById",
                table: "review_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Decision",
                table: "review_items",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "Version",
                table: "review_items",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DecidedAt",
                table: "review_items");

            migrationBuilder.DropColumn(
                name: "DecidedById",
                table: "review_items");

            migrationBuilder.DropColumn(
                name: "Decision",
                table: "review_items");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "review_items");
        }
    }
}
