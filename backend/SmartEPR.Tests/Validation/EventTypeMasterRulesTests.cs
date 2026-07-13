using SmartEPR.Core.Entities;
using SmartEPR.Core.Interfaces;
using Xunit;

namespace SmartEPR.Tests.Validation;

/// <summary>
/// Hardcoded validation rules for EventTypes master (table: EventTypes).
/// Fields: EventTypeID, UnderOrgID, SrNo (auto), EventType, IsActive.
/// </summary>
public sealed class EventTypeMasterRulesTests
{
    [Theory]
    [InlineData(0, "Meeting", false)]
    [InlineData(-1, "Meeting", false)]
    [InlineData(1, "", false)]
    [InlineData(1, "   ", false)]
    [InlineData(1, "Annual Day", true)]
    public void IsValidEventTypeMasterRow(long underOrgId, string eventType, bool expectedValid)
    {
        Assert.Equal(expectedValid, EventTypeMasterRules.IsValid(underOrgId, eventType));
    }

    [Fact]
    public void NormalizeEventType_TrimsWhitespace()
    {
        Assert.Equal("Sports Day", EventTypeMasterRules.NormalizeEventType("  Sports Day  "));
    }

    [Fact]
    public void NextSrNo_IsMaxPlusOnePerOrganization()
    {
        var existing = new[]
        {
            new EventTypeItem { UnderOrgID = 1, SrNo = 1 },
            new EventTypeItem { UnderOrgID = 1, SrNo = 3 },
            new EventTypeItem { UnderOrgID = 2, SrNo = 5 }
        };

        Assert.Equal(4, EventTypeMasterRules.NextSrNo(existing, 1));
        Assert.Equal(6, EventTypeMasterRules.NextSrNo(existing, 2));
        Assert.Equal(1, EventTypeMasterRules.NextSrNo(existing, 99));
    }
}

internal static class EventTypeMasterRules
{
    public static bool IsValid(long underOrgId, string eventType) =>
        underOrgId > 0 && !string.IsNullOrWhiteSpace(eventType);

    public static string NormalizeEventType(string eventType) => eventType.Trim();

    public static int NextSrNo(IEnumerable<EventTypeItem> items, long underOrgId)
    {
        var max = items.Where(x => x.UnderOrgID == underOrgId).Select(x => x.SrNo).DefaultIfEmpty(0).Max();
        return max + 1;
    }
}
