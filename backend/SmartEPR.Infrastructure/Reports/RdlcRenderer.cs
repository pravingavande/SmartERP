using Microsoft.Reporting.NETCore;
using SmartEPR.Core.DTOs.Reports;

namespace SmartEPR.Infrastructure.Reports;

public static class RdlcRenderer
{
    public static byte[]? RenderTabular(string rdlcFileName, IReadOnlyList<TabularReportRow> rows)
    {
        var reportPath = Path.Combine(AppContext.BaseDirectory, "Reports", rdlcFileName);
        if (!File.Exists(reportPath) || rows.Count == 0) return null;

        using var definition = File.OpenRead(reportPath);
        var report = new LocalReport();
        report.LoadReportDefinition(definition);
        report.DataSources.Add(new ReportDataSource("TabularReport", rows));
        return report.Render("PDF");
    }
}
