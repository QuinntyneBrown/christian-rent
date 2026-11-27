using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianRent.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class DecideReviewItems : Migration
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
                name: "DecidedBy",
                table: "review_items",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Decision",
                table: "review_items",
                type: "character varying(16)",
                maxLength: 16,
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Version",
                table: "review_items",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DecidedAt",
                table: "review_items");

            migrationBuilder.DropColumn(
                name: "DecidedBy",
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
