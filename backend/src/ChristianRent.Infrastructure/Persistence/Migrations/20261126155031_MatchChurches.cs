using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChristianRent.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MatchChurches : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_churches_Name_City",
                table: "churches");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "churches",
                type: "character varying(100)",
                maxLength: 100,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(120)",
                oldMaxLength: 120);

            migrationBuilder.AddColumn<string>(
                name: "MatchKey",
                table: "churches",
                type: "character varying(181)",
                maxLength: 181,
                nullable: false,
                defaultValue: "");

            // The churches already there, keyed in SQL as ChurchMatch keys them in .NET (ADR 0018):
            // trimmed, single-spaced, lower-cased and unaccented, joined by the unit separator.
            migrationBuilder.Sql("CREATE EXTENSION IF NOT EXISTS unaccent;");
            migrationBuilder.Sql(
                """
                UPDATE churches
                SET "MatchKey" = lower(unaccent(regexp_replace(btrim("Name"), '\s+', ' ', 'g')))
                    || chr(31)
                    || lower(unaccent(regexp_replace(btrim("City"), '\s+', ' ', 'g')));
                """);

            migrationBuilder.CreateIndex(
                name: "IX_churches_MatchKey",
                table: "churches",
                column: "MatchKey",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_churches_MatchKey",
                table: "churches");

            migrationBuilder.DropColumn(
                name: "MatchKey",
                table: "churches");

            migrationBuilder.AlterColumn<string>(
                name: "Name",
                table: "churches",
                type: "character varying(120)",
                maxLength: 120,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "character varying(100)",
                oldMaxLength: 100);

            migrationBuilder.CreateIndex(
                name: "IX_churches_Name_City",
                table: "churches",
                columns: new[] { "Name", "City" },
                unique: true);
        }
    }
}
