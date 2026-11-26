using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianRent.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class SearchListings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AlterDatabase()
                .Annotation("Npgsql:PostgresExtension:pg_trgm", ",,");

            migrationBuilder.AddColumn<string>(
                name: "SearchText",
                table: "listings",
                type: "character varying(1162)",
                maxLength: 1162,
                nullable: false,
                defaultValue: "");

            // The listings already there: lower-cased and unaccented in SQL; .NET normalises a
            // listing again when it next changes (ADR 0015).
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS unaccent;");
            migrationBuilder.Sql(
                """
                UPDATE listings
                SET "SearchText" = lower(unaccent(concat_ws(' ', "Title", nullif(btrim("Note"), ''), "Area")));
                """);

            migrationBuilder.CreateIndex(
                name: "IX_listings_SearchText",
                table: "listings",
                column: "SearchText")
                .Annotation("Npgsql:IndexMethod", "gin")
                .Annotation("Npgsql:IndexOperators", new[] { "gin_trgm_ops" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_listings_SearchText",
                table: "listings");

            migrationBuilder.DropColumn(
                name: "SearchText",
                table: "listings");

            migrationBuilder.AlterDatabase()
                .OldAnnotation("Npgsql:PostgresExtension:pg_trgm", ",,");
        }
    }
}
