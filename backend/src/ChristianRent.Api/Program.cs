using ChristianRent.Api.Health;
using ChristianRent.Infrastructure;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddHealthEndpoints();
builder.Services.AddControllers();

var app = builder.Build();

app.MapHealthEndpoints();
app.MapControllers();

app.Run();

/// <summary>The API's entry point, visible to the acceptance tests.</summary>
public partial class Program;
