using System.Globalization;
using SmartEPR.Core.DTOs.Reports;
using SmartEPR.Core.Interfaces;
using SmartEPR.Core.Validation;
using SmartEPR.Infrastructure.Reports;

namespace SmartEPR.Infrastructure.Services;

public sealed class ModuleReportService : IModuleReportService
{
    private static readonly CultureInfo InCulture = CultureInfo.CreateSpecificCulture("en-IN");

    private readonly IModuleReportRepository _repository;

    public ModuleReportService(IModuleReportRepository repository)
    {
        _repository = repository;
    }

    public async Task<byte[]?> RenderVoucherLedgerPdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        if (filter.OrgID is null or <= 0) return null;
        if (!filter.AllLedgerHeads && filter.LedgerHeadID is null or <= 0) return null;

        var (header, lines) = await _repository.GetVoucherLedgerAsync(filter, cancellationToken).ConfigureAwait(false);
        if (header is null || lines.Count == 0) return null;

        var printedOn = FormatPrintedOn();
        var orgHeader = header.OrganizationName?.Trim() ?? "—";
        var address = BuildAddress(header.Address, header.CityName);
        var filterText = filter.AllLedgerHeads
            ? "All Ledger Heads"
            : $"Ledger Head: {lines[0].LedgerHead ?? "—"}";

        var colHeaders = (
            ColHeader1: "Date",
            ColHeader2: "Voucher No",
            ColHeader3: "Type",
            ColHeader4: "Narration",
            ColHeader5: "Debit",
            ColHeader6: "Credit",
            ColHeader7: "",
            ColHeader8: "");

        var rows = new List<TabularReportRow>();
        foreach (var line in lines)
        {
            var isReceipt = AuditVoucherRules.BalanceSign(line.VType) > 0;
            var amount = FormatAmount(line.Amount);
            rows.Add(CreateRow(
                orgHeader,
                address,
                "Voucher Ledger Report",
                filterText,
                printedOn,
                colHeaders,
                filter.AllLedgerHeads ? line.LedgerHead ?? "—" : string.Empty,
                filter.AllLedgerHeads ? $"Ledger Head: {line.LedgerHead ?? "—"}" : string.Empty,
                FormatShortDate(line.VDate),
                line.VCode?.ToString() ?? string.Empty,
                FormatVoucherType(line.VType),
                line.LedgerHeadNarration ?? string.Empty,
                isReceipt ? string.Empty : amount,
                isReceipt ? amount : string.Empty,
                string.Empty,
                string.Empty));
        }

        return RdlcRenderer.RenderTabular(
            filter.AllLedgerHeads ? "VoucherLedgerReport.rdlc" : "TabularReport.rdlc",
            rows);
    }

    public async Task<byte[]?> RenderTrialBalancePdfAsync(long orgId, CancellationToken cancellationToken = default)
    {
        if (orgId <= 0) return null;

        var (header, lines) = await _repository.GetTrialBalanceAsync(orgId, cancellationToken).ConfigureAwait(false);
        if (header is null || lines.Count == 0) return null;

        var printedOn = FormatPrintedOn();
        var orgHeader = header.OrganizationName?.Trim() ?? "—";
        var address = BuildAddress(header.Address, header.CityName);
        var colHeaders = (
            ColHeader1: "Ledger Head",
            ColHeader2: "Opening Balance",
            ColHeader3: "Debit",
            ColHeader4: "Credit",
            ColHeader5: "Closing Balance",
            ColHeader6: "",
            ColHeader7: "",
            ColHeader8: "");

        var rows = lines.Select(line => CreateRow(
            orgHeader,
            address,
            "Trial Balance",
            string.Empty,
            printedOn,
            colHeaders,
            string.Empty,
            string.Empty,
            line.LedgerHead ?? "—",
            FormatAmount(line.OpeningBalance),
            FormatAmount(line.Debit),
            FormatAmount(line.Credit),
            FormatAmount(line.ClosingBalance),
            string.Empty,
            string.Empty,
            string.Empty)).ToList();

        return RdlcRenderer.RenderTabular("TabularReport.rdlc", rows);
    }

    public async Task<byte[]?> RenderSchoolDetailsPdfAsync(long sansthaId, CancellationToken cancellationToken = default)
    {
        if (sansthaId <= 0) return null;

        var (header, lines) = await _repository.GetSchoolDetailsAsync(sansthaId, cancellationToken).ConfigureAwait(false);
        if (header is null || lines.Count == 0) return null;

        var printedOn = FormatPrintedOn();
        var orgHeader = header.SansthaName?.Trim() ?? "—";
        var address = header.SansthaAddress?.Trim() ?? string.Empty;
        var colHeaders = (
            ColHeader1: "Sr No",
            ColHeader2: "School / College",
            ColHeader3: "Category",
            ColHeader4: "City",
            ColHeader5: "UDISE No",
            ColHeader6: "Mobile",
            ColHeader7: "Email",
            ColHeader8: "Status");

        var rows = lines.Select(line => CreateRow(
            orgHeader,
            address,
            "School / College Report",
            string.Empty,
            printedOn,
            colHeaders,
            string.Empty,
            string.Empty,
            line.SrNo?.ToString() ?? string.Empty,
            line.OrganizationName ?? "—",
            line.SchoolCategoryName ?? line.BusinessCategoryName ?? "—",
            line.CityName ?? "—",
            line.UDiesNo ?? "—",
            line.MobileNo ?? line.PhoneNo ?? "—",
            line.EmailID ?? "—",
            line.StatusText ?? "—")).ToList();

        return RdlcRenderer.RenderTabular("TabularReport.rdlc", rows);
    }

    public Task<byte[]?> RenderEmployeePdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default)
        => RenderEmployeeReportAsync(filter, "ALL", "School/College/Sanstha Wise Employee Report", cancellationToken);

    public Task<byte[]?> RenderEmployeeSeniorityPdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default)
        => RenderEmployeeReportAsync(filter, "SENIORITY", "Employee Seniority Report", cancellationToken);

    public Task<byte[]?> RenderRetiredEmployeePdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default)
        => RenderEmployeeReportAsync(filter, "RETIRED", "Retired Employee Report", cancellationToken);

    public async Task<byte[]?> RenderInwardRegisterPdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        if (filter.FromDate is null || filter.ToDate is null) return null;

        var lines = await _repository.GetInwardRegisterAsync(filter, cancellationToken).ConfigureAwait(false);
        if (lines.Count == 0) return null;

        var printedOn = FormatPrintedOn();
        var filterText = $"From {FormatShortDate(filter.FromDate)} to {FormatShortDate(filter.ToDate)}";
        var colHeaders = (
            ColHeader1: "Record No",
            ColHeader2: "Inward Date",
            ColHeader3: "File No",
            ColHeader4: "Letter No",
            ColHeader5: "From Whom",
            ColHeader6: "Subject",
            ColHeader7: "School",
            ColHeader8: "Remark");

        var rows = lines.Select(line => CreateRow(
            "Inward Register Report",
            string.Empty,
            "Inward Register Report",
            filterText,
            printedOn,
            colHeaders,
            string.Empty,
            string.Empty,
            line.RecordNo?.ToString() ?? string.Empty,
            FormatShortDate(line.IRDate),
            line.FileNo ?? "—",
            line.LetterNo ?? "—",
            line.FromWhomReceived ?? "—",
            line.Subject ?? "—",
            line.OrganizationName ?? "—",
            line.Remark ?? "—")).ToList();

        return RdlcRenderer.RenderTabular("TabularReport.rdlc", rows);
    }

    public async Task<byte[]?> RenderOutwardRegisterPdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        if (filter.FromDate is null || filter.ToDate is null) return null;

        var lines = await _repository.GetOutwardRegisterAsync(filter, cancellationToken).ConfigureAwait(false);
        if (lines.Count == 0) return null;

        var printedOn = FormatPrintedOn();
        var filterText = $"From {FormatShortDate(filter.FromDate)} to {FormatShortDate(filter.ToDate)}";
        var colHeaders = (
            ColHeader1: "Record No",
            ColHeader2: "Outward Date",
            ColHeader3: "File No",
            ColHeader4: "Subject",
            ColHeader5: "Address",
            ColHeader6: "Enclosures",
            ColHeader7: "School",
            ColHeader8: "Remark");

        var rows = lines.Select(line => CreateRow(
            "Outward Register Report",
            string.Empty,
            "Outward Register Report",
            filterText,
            printedOn,
            colHeaders,
            string.Empty,
            string.Empty,
            line.RecordNo?.ToString() ?? string.Empty,
            FormatShortDate(line.ORDate),
            line.FileNo ?? "—",
            line.Subject ?? "—",
            line.Address ?? "—",
            line.Enclosures ?? "—",
            line.OrganizationName ?? "—",
            line.Remark ?? "—")).ToList();

        return RdlcRenderer.RenderTabular("TabularReport.rdlc", rows);
    }

    public async Task<byte[]?> RenderStockRegisterPdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        if (filter.OrgID is null or <= 0) return null;

        var (header, lines) = await _repository.GetStockRegisterAsync(filter, cancellationToken).ConfigureAwait(false);
        if (header is null || lines.Count == 0) return null;

        var printedOn = FormatPrintedOn();
        var orgHeader = header.OrganizationName?.Trim() ?? "—";
        var address = BuildAddress(header.Address, header.CityName);
        var filterText = filter.ItemGroupID is > 0 ? "Filtered by Item Group" : "All Item Groups";
        var colHeaders = (
            ColHeader1: "Item Group",
            ColHeader2: "Item Name",
            ColHeader3: "Opening Qty",
            ColHeader4: "Inward Qty",
            ColHeader5: "Outward Qty",
            ColHeader6: "Closing Qty",
            ColHeader7: "",
            ColHeader8: "");

        var rows = lines.Select(line => CreateRow(
            orgHeader,
            address,
            "Stock Register",
            filterText,
            printedOn,
            colHeaders,
            string.Empty,
            string.Empty,
            line.ItemGroupName ?? "—",
            line.ItemName ?? "—",
            FormatQty(line.OpeningQty),
            FormatQty(line.InwardQty),
            FormatQty(line.OutwardQty),
            FormatQty(line.ClosingQty),
            string.Empty,
            string.Empty)).ToList();

        return RdlcRenderer.RenderTabular("TabularReport.rdlc", rows);
    }

    private async Task<byte[]?> RenderEmployeeReportAsync(
        ModuleReportFilterDto filter,
        string reportMode,
        string title,
        CancellationToken cancellationToken)
    {
        if ((filter.OrgID is null or <= 0) && (filter.SansthaID is null or <= 0)) return null;
        if (filter.OrgID is > 0 && filter.SansthaID is > 0) return null;

        var (header, lines) = await _repository.GetUserDetailAsync(filter, reportMode, cancellationToken).ConfigureAwait(false);
        if (header is null || lines.Count == 0) return null;

        var printedOn = FormatPrintedOn();
        var scope = header.ScopeName?.Trim() ?? "—";
        var colHeaders = (
            ColHeader1: "Sr No",
            ColHeader2: "Employee Name",
            ColHeader3: "Designation",
            ColHeader4: "School",
            ColHeader5: "Mobile",
            ColHeader6: "Joining Date",
            ColHeader7: "Staff Type",
            ColHeader8: "Role");

        var rows = lines.Select(line => CreateRow(
            scope,
            string.Empty,
            title,
            string.Empty,
            printedOn,
            colHeaders,
            string.Empty,
            string.Empty,
            line.SrNo?.ToString() ?? string.Empty,
            line.EmployeeName ?? "—",
            line.DesignationName ?? "—",
            line.OrganizationName ?? "—",
            line.MobileNo1 ?? "—",
            FormatShortDate(line.DateOfWorkingStart),
            line.StaffTypeName ?? "—",
            line.UserRoleName ?? "—")).ToList();

        return RdlcRenderer.RenderTabular("TabularReport.rdlc", rows);
    }

    private static TabularReportRow CreateRow(
        string organizationHeader,
        string address,
        string reportTitle,
        string filterText,
        string printedOn,
        (string ColHeader1, string ColHeader2, string ColHeader3, string ColHeader4, string ColHeader5, string ColHeader6, string ColHeader7, string ColHeader8) headers,
        string groupKey,
        string groupTitle,
        string col1,
        string col2,
        string col3,
        string col4,
        string col5,
        string col6,
        string col7,
        string col8) =>
        new()
        {
            OrganizationHeader = organizationHeader,
            Address = address,
            ReportTitle = reportTitle,
            FilterText = filterText,
            PrintedOn = printedOn,
            GroupKey = groupKey,
            GroupTitle = groupTitle,
            ColHeader1 = headers.ColHeader1,
            ColHeader2 = headers.ColHeader2,
            ColHeader3 = headers.ColHeader3,
            ColHeader4 = headers.ColHeader4,
            ColHeader5 = headers.ColHeader5,
            ColHeader6 = headers.ColHeader6,
            ColHeader7 = headers.ColHeader7,
            ColHeader8 = headers.ColHeader8,
            Col1 = col1,
            Col2 = col2,
            Col3 = col3,
            Col4 = col4,
            Col5 = col5,
            Col6 = col6,
            Col7 = col7,
            Col8 = col8
        };

    private static string FormatAmount(decimal value) => value.ToString("#,##0.00", InCulture);
    private static string FormatQty(decimal value) => value.ToString("#,##0.##", InCulture);
    private static string FormatShortDate(DateTime? date) =>
        date.HasValue ? date.Value.ToString("d-MMM-yy", CultureInfo.InvariantCulture) : string.Empty;
    private static string FormatPrintedOn() => DateTime.Now.ToString("dd-MMM-yyyy hh:mm tt");
    private static string BuildAddress(string? address, string? city)
    {
        var parts = new[] { address?.Trim(), city?.Trim() }
            .Where(s => !string.IsNullOrWhiteSpace(s) && s != "1");
        return string.Join(", ", parts);
    }

    private static string FormatVoucherType(string? vType)
    {
        var t = (vType ?? string.Empty).Trim().ToUpperInvariant();
        return t switch
        {
            "BD" => "Bank Deposit",
            "BW" => "Bank Withdraw",
            "RV" or "R" or "RECEIPT" => "Receipt",
            _ => "Payment"
        };
    }
}
