using System.Text.Json;
using Microsoft.AspNetCore.Cors.Infrastructure;
using SmartEPR.Core.Common;

namespace SmartEPR.Api.Middleware;

/// <summary>
/// Ensures unhandled exceptions return JSON (not an empty IIS 500) and keep CORS headers
/// so browser clients on smartepr.web.app can read the error instead of reporting CORS failure.
/// </summary>
public sealed class ExceptionHandlingMiddleware
{
    private const string CorsPolicyName = "Frontend";

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(RequestDelegate next, ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unhandled exception for {Method} {Path}", context.Request.Method, context.Request.Path);

            if (context.Response.HasStarted)
                throw;

            context.Response.Clear();
            context.Response.StatusCode = StatusCodes.Status500InternalServerError;
            context.Response.ContentType = "application/json; charset=utf-8";

            await ApplyCorsHeadersAsync(context).ConfigureAwait(false);

            var payload = ApiResponse<object>.Fail(
                context.RequestServices.GetRequiredService<IHostEnvironment>().IsDevelopment()
                    ? ex.Message
                    : "An unexpected error occurred. Please try again or contact support.");

            await context.Response.WriteAsync(JsonSerializer.Serialize(payload, JsonOptions)).ConfigureAwait(false);
        }
    }

    private static async Task ApplyCorsHeadersAsync(HttpContext context)
    {
        var corsService = context.RequestServices.GetService<ICorsService>();
        var corsProvider = context.RequestServices.GetService<ICorsPolicyProvider>();
        if (corsService is null || corsProvider is null)
            return;

        var policy = await corsProvider.GetPolicyAsync(context, CorsPolicyName).ConfigureAwait(false);
        if (policy is null)
            return;

        var result = corsService.EvaluatePolicy(context, policy);
        corsService.ApplyResult(result, context.Response);
    }
}

public static class ExceptionHandlingMiddlewareExtensions
{
    public static IApplicationBuilder UseGlobalExceptionHandling(this IApplicationBuilder app) =>
        app.UseMiddleware<ExceptionHandlingMiddleware>();
}
