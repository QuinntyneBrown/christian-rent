using ChristianRent.Api.Access;
using ChristianRent.Api.Errors;
using ChristianRent.Api.Health;
using ChristianRent.Application;
using ChristianRent.Infrastructure;
using Microsoft.AspNetCore.Mvc;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();
builder.Services.AddInfrastructure(builder.Configuration);
builder.Services.AddAccess();
builder.Services.AddHealthEndpoints();

builder.Services.AddProblemDetails(options =>
    options.CustomizeProblemDetails = context =>
        context.ProblemDetails.Extensions["traceId"] = Problems.TraceId(context.HttpContext));
builder.Services.AddExceptionHandler<ProblemExceptionHandler>();
builder.Services.AddExceptionHandler<UnhandledExceptionHandler>();

builder.Services.AddControllers();
builder.Services.Configure<ApiBehaviorOptions>(options =>
    options.InvalidModelStateResponseFactory = context =>
    {
        var problem = new ValidationProblemDetails(context.ModelState)
        {
            Status = StatusCodes.Status400BadRequest,
            Title = "Check the fields",
            Extensions = { ["code"] = "validation_failed" },
        };
        return new ObjectResult(problem) { StatusCode = StatusCodes.Status400BadRequest, ContentTypes = { "application/problem+json" } };
    });

var app = builder.Build();

app.UseExceptionHandler(new ExceptionHandlerOptions { SuppressDiagnosticsCallback = _ => true });
app.UseStatusCodePages();
app.UseAuthentication();
app.UseAuthorization();

app.MapHealthEndpoints();
app.MapControllers();

app.Run();

/// <summary>The API's entry point, visible to the acceptance tests.</summary>
public partial class Program;
