using Xunit;

namespace SmartEPR.Tests.Validation;

/// <summary>
/// Pure rules shared by ClassMaster / ACAccountRegisterMaster / DRHeadMaster:
/// Org (or UnderOrg) + mandatory SrNo uniqueness per org, and import destination guards.
/// </summary>
public sealed class OrgWiseMasterRulesTests
{
    [Theory]
    [InlineData(0, 1, "Name", false)]
    [InlineData(-1, 1, "Name", false)]
    [InlineData(1, 0, "Name", false)]
    [InlineData(1, -1, "Name", false)]
    [InlineData(1, 1, "", false)]
    [InlineData(1, 1, "   ", false)]
    [InlineData(1, 1, "Valid", true)]
    [InlineData(5, 12, "Building Fund", true)]
    public void IsValidOrgWiseMasterRow(long orgId, long srNo, string name, bool expected)
    {
        Assert.Equal(expected, OrgWiseMasterRules.IsValid(orgId, srNo, name));
    }

    [Fact]
    public void NormalizeName_TrimsWhitespace()
    {
        Assert.Equal("Grade 1", OrgWiseMasterRules.NormalizeName("  Grade 1  "));
    }

    [Fact]
    public void NextSrNo_IsMaxPlusOnePerOrganization()
    {
        var rows = new[]
        {
            new OrgWiseMasterRow(1, 1),
            new OrgWiseMasterRow(1, 3),
            new OrgWiseMasterRow(2, 5),
            new OrgWiseMasterRow(1, 2)
        };

        Assert.Equal(4, OrgWiseMasterRules.NextSrNo(rows, 1));
        Assert.Equal(6, OrgWiseMasterRules.NextSrNo(rows, 2));
        Assert.Equal(1, OrgWiseMasterRules.NextSrNo(rows, 99));
    }

    [Fact]
    public void IsDuplicateSrNo_DetectsClashWithinSameOrg_IgnoringOtherOrgsAndSelf()
    {
        var rows = new[]
        {
            new OrgWiseMasterRow(1, 1, Id: 10),
            new OrgWiseMasterRow(1, 2, Id: 11),
            new OrgWiseMasterRow(2, 1, Id: 20)
        };

        Assert.True(OrgWiseMasterRules.IsDuplicateSrNo(rows, orgId: 1, srNo: 1, excludeId: null));
        Assert.False(OrgWiseMasterRules.IsDuplicateSrNo(rows, orgId: 1, srNo: 1, excludeId: 10));
        Assert.False(OrgWiseMasterRules.IsDuplicateSrNo(rows, orgId: 1, srNo: 9, excludeId: null));
        Assert.False(OrgWiseMasterRules.IsDuplicateSrNo(rows, orgId: 2, srNo: 2, excludeId: null));
        Assert.True(OrgWiseMasterRules.IsDuplicateSrNo(rows, orgId: 2, srNo: 1, excludeId: null));
    }

    [Theory]
    [InlineData(0, new long[] { 1 }, "Organization is required.")]
    [InlineData(-1, new long[] { 1 }, "Organization is required.")]
    [InlineData(1, new long[] { 1 }, "Cannot import into the source organization.")]
    [InlineData(2, new long[0], "Select at least one item to import.")]
    [InlineData(2, null, "Select at least one item to import.")]
    [InlineData(3, new long[] { 1, 2 }, null)]
    public void ValidateImportRequest_CoversAllGuards(long destinationOrgId, long[]? ids, string? expectedError)
    {
        Assert.Equal(expectedError, OrgWiseMasterRules.ValidateImport(destinationOrgId, ids, sourceOrgId: 1));
    }

    [Fact]
    public void ValidateImport_CustomEmptyMessage_MatchesFeatureWording()
    {
        Assert.Equal(
            "Select at least one class to import.",
            OrgWiseMasterRules.ValidateImport(2, [], sourceOrgId: 1, emptySelectionMessage: "Select at least one class to import."));
        Assert.Equal(
            "Select at least one account register to import.",
            OrgWiseMasterRules.ValidateImport(2, [], sourceOrgId: 1, emptySelectionMessage: "Select at least one account register to import."));
        Assert.Equal(
            "Select at least one donation head to import.",
            OrgWiseMasterRules.ValidateImport(2, [], sourceOrgId: 1, emptySelectionMessage: "Select at least one donation head to import."));
        Assert.Equal(
            "Select at least one ledger head to import.",
            OrgWiseMasterRules.ValidateImport(2, [], sourceOrgId: 1, emptySelectionMessage: "Select at least one ledger head to import."));
    }

    [Fact]
    public void ImportSkipByName_CaseInsensitiveWithinDestination()
    {
        var destinationNames = new[] { "General Fund", "Building Fund" };

        Assert.True(OrgWiseMasterRules.ShouldSkipImportByName(destinationNames, "general fund"));
        Assert.True(OrgWiseMasterRules.ShouldSkipImportByName(destinationNames, "  Building Fund  "));
        Assert.False(OrgWiseMasterRules.ShouldSkipImportByName(destinationNames, "Corpus"));
    }

    [Fact]
    public void ImportCounts_ImportedPlusSkippedEqualsSelected()
    {
        var destination = new[] { "A", "B" };
        var selected = new[] { "A", "C", "b", "D" };

        var (imported, skipped) = OrgWiseMasterRules.CountImportResults(destination, selected);

        Assert.Equal(2, imported);
        Assert.Equal(2, skipped);
        Assert.Equal(selected.Length, imported + skipped);
    }
}

internal readonly record struct OrgWiseMasterRow(long OrgId, long SrNo, long? Id = null);

internal static class OrgWiseMasterRules
{
    public static bool IsValid(long orgId, long srNo, string name) =>
        orgId > 0 && srNo > 0 && !string.IsNullOrWhiteSpace(name);

    public static string NormalizeName(string name) => name.Trim();

    public static long NextSrNo(IEnumerable<OrgWiseMasterRow> rows, long orgId)
    {
        var max = rows.Where(r => r.OrgId == orgId).Select(r => r.SrNo).DefaultIfEmpty(0).Max();
        return max + 1;
    }

    public static bool IsDuplicateSrNo(IEnumerable<OrgWiseMasterRow> rows, long orgId, long srNo, long? excludeId) =>
        rows.Any(r => r.OrgId == orgId && r.SrNo == srNo && (excludeId is null || r.Id != excludeId));

    public static string? ValidateImport(
        long destinationOrgId,
        IReadOnlyList<long>? ids,
        long sourceOrgId = 1,
        string emptySelectionMessage = "Select at least one item to import.")
    {
        if (destinationOrgId <= 0)
            return "Organization is required.";
        if (destinationOrgId == sourceOrgId)
            return "Cannot import into the source organization.";
        if (ids is null || ids.Count == 0)
            return emptySelectionMessage;
        return null;
    }

    public static bool ShouldSkipImportByName(IEnumerable<string> destinationNames, string sourceName)
    {
        var normalized = NormalizeName(sourceName);
        return destinationNames.Any(n => string.Equals(NormalizeName(n), normalized, StringComparison.OrdinalIgnoreCase));
    }

    public static (int Imported, int Skipped) CountImportResults(
        IEnumerable<string> destinationNames,
        IEnumerable<string> selectedSourceNames)
    {
        var imported = 0;
        var skipped = 0;
        foreach (var name in selectedSourceNames)
        {
            if (ShouldSkipImportByName(destinationNames, name))
                skipped++;
            else
                imported++;
        }

        return (imported, skipped);
    }
}
