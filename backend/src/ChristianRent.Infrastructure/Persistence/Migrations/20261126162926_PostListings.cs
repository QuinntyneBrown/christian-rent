using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianRent.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class PostListings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_listings_MemberId",
                table: "listings");

            migrationBuilder.AddColumn<Guid>(
                name: "ClientRequestId",
                table: "listings",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_listings_MemberId_ClientRequestId",
                table: "listings",
                columns: new[] { "MemberId", "ClientRequestId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_listings_MemberId_ClientRequestId",
                table: "listings");

            migrationBuilder.DropColumn(
                name: "ClientRequestId",
                table: "listings");

            migrationBuilder.CreateIndex(
                name: "IX_listings_MemberId",
                table: "listings",
                column: "MemberId");
        }
    }
}
