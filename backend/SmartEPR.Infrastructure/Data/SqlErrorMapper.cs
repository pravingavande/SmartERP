using Microsoft.Data.SqlClient;

namespace SmartEPR.Infrastructure.Data;

internal static class SqlErrorMapper
{
    public static string ToUserMessage(SqlException ex, string module)
    {
        return ex.Number switch
        {
            2812 => $"{module} database objects are missing. Run SQL script 033_Event_Management_V2.sql (or hotfix 034/035) on the server.",
            208 => $"{module} table schema is outdated. Run SQL script 033_Event_Management_V2.sql (or hotfix 034/035) on the server.",
            51001 => "Organization is required.",
            51002 => "Event Type is required.",
            51003 => "Organization is required.",
            51004 => "Location name is required.",
            51005 => "Read-only user cannot save events.",
            51006 => "At least one school is required.",
            51007 => "Read-only user cannot delete events.",
            _ => string.IsNullOrWhiteSpace(ex.Message) ? $"Unable to save {module.ToLowerInvariant()}." : ex.Message
        };
    }
}
