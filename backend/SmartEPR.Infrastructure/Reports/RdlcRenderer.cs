using Microsoft.Reporting.NETCore;

namespace SmartEPR.Infrastructure.Reports;

public static class RdlcRenderer
{
    public static byte[]? Render<T>(string rdlcFileName, string dataSetName, IReadOnlyList<T> rows)
    {
        var reportPath = Path.Combine(AppContext.BaseDirectory, "Reports", rdlcFileName);
        if (!File.Exists(reportPath) || rows.Count == 0) return null;

        using var definition = File.OpenRead(reportPath);
        var report = new LocalReport();
        report.LoadReportDefinition(definition);
        report.DataSources.Add(new ReportDataSource(dataSetName, rows));
        return report.Render("PDF");
    }
}
