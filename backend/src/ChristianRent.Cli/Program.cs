using ChristianRent.Cli;
using ChristianRent.Infrastructure;
using Microsoft.Extensions.Hosting;

// Reads the same configuration as the API: appsettings, environment variables
// (ConnectionStrings__Default) and, in Development, user secrets.
var builder = Host.CreateApplicationBuilder(args);
builder.Services.AddInfrastructure(builder.Configuration);

using var host = builder.Build();
using var cancellation = new CancellationTokenSource();
Console.CancelKeyPress += (_, eventArgs) =>
{
    eventArgs.Cancel = true;
    cancellation.Cancel();
};

return await CliApp.RunAsync(args, host.Services, Console.Out, cancellation.Token);
