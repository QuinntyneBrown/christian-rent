using System.Collections.Concurrent;
using Microsoft.Extensions.Logging;

namespace ChristianRent.Api.Tests.Support;

/// <summary>Every log entry the API writes, for tests that check what is recorded.</summary>
public sealed class CapturedLogs : ILoggerProvider
{
    public ConcurrentQueue<CapturedLog> Entries { get; } = new();

    public ILogger CreateLogger(string categoryName) => new Logger(this, categoryName);

    public void Dispose()
    {
    }

    private sealed class Logger(CapturedLogs owner, string category) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull => null;

        public bool IsEnabled(LogLevel logLevel) => true;

        public void Log<TState>(LogLevel logLevel, EventId eventId, TState state, Exception? exception, Func<TState, Exception?, string> formatter)
        {
            var values = state as IReadOnlyList<KeyValuePair<string, object?>> ?? [];
            owner.Entries.Enqueue(new CapturedLog(
                category,
                logLevel,
                formatter(state, exception),
                values.ToDictionary(pair => pair.Key, pair => pair.Value?.ToString()),
                exception));
        }
    }
}

public sealed record CapturedLog(
    string Category,
    LogLevel Level,
    string Message,
    IReadOnlyDictionary<string, string?> Values,
    Exception? Exception);
