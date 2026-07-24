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
        if (filter.FromDate is not null && filter.ToDate is not null)
            filterText += $" | From {FormatShortDate(filter.FromDate)} to {FormatShortDate(filter.ToDate)}";

        if (filter.AllLedgerHeads)
        {
            var rows = lines.Select(line =>
            {
                var isReceipt = AuditVoucherRules.BalanceSign(line.VType) > 0;
                var amount = FormatAmount(line.Amount);
                return new VoucherLedgerAllHeadsReportRow
                {
                    OrganizationHeader = orgHeader,
                    Address = address,
                    ReportTitle = "Voucher Ledger Report",
                    FilterText = filterText,
                    PrintedOn = printedOn,
                    GroupKey = line.LedgerHead ?? "—",
                    GroupTitle = $"Ledger Head: {line.LedgerHead ?? "—"}",
                    VDate = FormatShortDate(line.VDate),
                    VCode = line.VCode?.ToString() ?? string.Empty,
                    VType = FormatVoucherType(line.VType),
                    Narration = line.LedgerHeadNarration ?? string.Empty,
                    Debit = isReceipt ? string.Empty : amount,
                    Credit = isReceipt ? amount : string.Empty
                };
            }).ToList();

            return RdlcRenderer.Render("VoucherLedgerAllHeadsReport.rdlc", "VoucherLedgerAllHeads", rows);
        }

        var singleRows = lines.Select(line =>
        {
            var isReceipt = AuditVoucherRules.BalanceSign(line.VType) > 0;
            var amount = FormatAmount(line.Amount);
            return new VoucherLedgerReportRow
            {
                OrganizationHeader = orgHeader,
                Address = address,
                ReportTitle = "Voucher Ledger Report",
                FilterText = filterText,
                PrintedOn = printedOn,
                VDate = FormatShortDate(line.VDate),
                VCode = line.VCode?.ToString() ?? string.Empty,
                VType = FormatVoucherType(line.VType),
                Narration = line.LedgerHeadNarration ?? string.Empty,
                Debit = isReceipt ? string.Empty : amount,
                Credit = isReceipt ? amount : string.Empty
            };
        }).ToList();

        return RdlcRenderer.Render("VoucherLedgerReport.rdlc", "VoucherLedger", singleRows);
    }

    public async Task<byte[]?> RenderTrialBalancePdfAsync(long orgId, CancellationToken cancellationToken = default)
    {
        if (orgId <= 0) return null;

        var (header, lines) = await _repository.GetTrialBalanceAsync(orgId, cancellationToken).ConfigureAwait(false);
        if (header is null || lines.Count == 0) return null;

        var printedOn = FormatPrintedOn();
        var orgHeader = header.OrganizationName?.Trim() ?? "—";
        var address = BuildAddress(header.Address, header.CityName);

        var rows = lines.Select(line => new TrialBalanceReportRow
        {
            OrganizationHeader = orgHeader,
            Address = address,
            ReportTitle = "Trial Balance",
            FilterText = string.Empty,
            PrintedOn = printedOn,
            LedgerHead = line.LedgerHead ?? "—",
            OpeningBalance = FormatAmount(line.OpeningBalance),
            Debit = FormatAmount(line.Debit),
            Credit = FormatAmount(line.Credit),
            ClosingBalance = FormatAmount(line.ClosingBalance)
        }).ToList();

        return RdlcRenderer.Render("TrialBalanceReport.rdlc", "TrialBalance", rows);
    }

    public async Task<byte[]?> RenderSchoolDetailsPdfAsync(long sansthaId, CancellationToken cancellationToken = default)
    {
        if (sansthaId <= 0) return null;

        var (header, lines) = await _repository.GetSchoolDetailsAsync(sansthaId, cancellationToken).ConfigureAwait(false);
        if (header is null || lines.Count == 0) return null;

        var printedOn = FormatPrintedOn();
        var orgHeader = header.SansthaName?.Trim() ?? "—";
        var address = header.SansthaAddress?.Trim() ?? string.Empty;

        var rows = lines.Select(line => new SchoolCollegeReportRow
        {
            OrganizationHeader = orgHeader,
            Address = address,
            ReportTitle = "School / College Report",
            FilterText = string.Empty,
            PrintedOn = printedOn,
            SrNo = line.SrNo?.ToString() ?? string.Empty,
            SchoolName = line.OrganizationName ?? "—",
            Category = line.SchoolCategoryName ?? line.BusinessCategoryName ?? "—",
            City = line.CityName ?? "—",
            UDiseNo = line.UDiesNo ?? "—",
            Mobile = line.MobileNo ?? line.PhoneNo ?? "—",
            Email = line.EmailID ?? "—",
            Status = line.StatusText ?? "—"
        }).ToList();

        return RdlcRenderer.Render("SchoolCollegeReport.rdlc", "SchoolCollege", rows);
    }

    public Task<byte[]?> RenderEmployeePdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default)
        => RenderEmployeeReportAsync(filter, "ALL", "School/College/Sanstha Wise Employee Report", "EmployeeReport.rdlc", "Employee", cancellationToken);

    public Task<byte[]?> RenderEmployeeSeniorityPdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default)
        => RenderEmployeeReportAsync(filter, "SENIORITY", "Employee Seniority Report", "EmployeeSeniorityReport.rdlc", "EmployeeSeniority", cancellationToken);

    public Task<byte[]?> RenderRetiredEmployeePdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default)
        => RenderEmployeeReportAsync(filter, "RETIRED", "Retired Employee Report", "RetiredEmployeeReport.rdlc", "RetiredEmployee", cancellationToken);

    public async Task<byte[]?> RenderInwardRegisterPdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        if (filter.FromDate is null || filter.ToDate is null) return null;

        var lines = await _repository.GetInwardRegisterAsync(filter, cancellationToken).ConfigureAwait(false);
        if (lines.Count == 0) return null;

        var printedOn = FormatPrintedOn();
        var filterText = $"From {FormatShortDate(filter.FromDate)} to {FormatShortDate(filter.ToDate)}";

        var rows = lines.Select(line => new InwardRegisterReportRow
        {
            OrganizationHeader = "Inward Register Report",
            Address = string.Empty,
            ReportTitle = "Inward Register Report",
            FilterText = filterText,
            PrintedOn = printedOn,
            RecordNo = line.RecordNo?.ToString() ?? string.Empty,
            InwardDate = FormatShortDate(line.IRDate),
            FileNo = line.FileNo ?? "—",
            LetterNo = line.LetterNo ?? "—",
            FromWhom = line.FromWhomReceived ?? "—",
            Subject = line.Subject ?? "—",
            School = line.OrganizationName ?? "—",
            Remark = line.Remark ?? "—"
        }).ToList();

        return RdlcRenderer.Render("InwardRegisterReport.rdlc", "InwardRegister", rows);
    }

    public async Task<byte[]?> RenderOutwardRegisterPdfAsync(ModuleReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        if (filter.FromDate is null || filter.ToDate is null) return null;

        var lines = await _repository.GetOutwardRegisterAsync(filter, cancellationToken).ConfigureAwait(false);
        if (lines.Count == 0) return null;

        var printedOn = FormatPrintedOn();
        var filterText = $"From {FormatShortDate(filter.FromDate)} to {FormatShortDate(filter.ToDate)}";

        var rows = lines.Select(line => new OutwardRegisterReportRow
        {
            OrganizationHeader = "Outward Register Report",
            Address = string.Empty,
            ReportTitle = "Outward Register Report",
            FilterText = filterText,
            PrintedOn = printedOn,
            RecordNo = line.RecordNo?.ToString() ?? string.Empty,
            OutwardDate = FormatShortDate(line.ORDate),
            FileNo = line.FileNo ?? "—",
            Subject = line.Subject ?? "—",
            AddressLine = line.Address ?? "—",
            Enclosures = line.Enclosures ?? "—",
            School = line.OrganizationName ?? "—",
            Remark = line.Remark ?? "—"
        }).ToList();

        return RdlcRenderer.Render("OutwardRegisterReport.rdlc", "OutwardRegister", rows);
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

        var rows = lines.Select(line => new StockRegisterReportRow
        {
            OrganizationHeader = orgHeader,
            Address = address,
            ReportTitle = "Stock Register",
            FilterText = filterText,
            PrintedOn = printedOn,
            ItemGroup = line.ItemGroupName ?? "—",
            ItemName = line.ItemName ?? "—",
            OpeningQty = FormatQty(line.OpeningQty),
            InwardQty = FormatQty(line.InwardQty),
            OutwardQty = FormatQty(line.OutwardQty),
            ClosingQty = FormatQty(line.ClosingQty)
        }).ToList();

        return RdlcRenderer.Render("StockRegisterReport.rdlc", "StockRegister", rows);
    }

    private async Task<byte[]?> RenderEmployeeReportAsync(
        ModuleReportFilterDto filter,
        string reportMode,
        string title,
        string rdlcFileName,
        string dataSetName,
        CancellationToken cancellationToken)
    {
        if ((filter.OrgID is null or <= 0) && (filter.SansthaID is null or <= 0)) return null;
        if (filter.OrgID is > 0 && filter.SansthaID is > 0) return null;

        var (header, lines) = await _repository.GetUserDetailAsync(filter, reportMode, cancellationToken).ConfigureAwait(false);
        if (header is null || lines.Count == 0) return null;

        var printedOn = FormatPrintedOn();
        var scope = header.ScopeName?.Trim() ?? "—";

        var rows = lines.Select(line => new EmployeeReportRow
        {
            OrganizationHeader = scope,
            Address = string.Empty,
            ReportTitle = title,
            FilterText = string.Empty,
            PrintedOn = printedOn,
            SrNo = line.SrNo?.ToString() ?? string.Empty,
            EmployeeName = line.EmployeeName ?? "—",
            Designation = line.DesignationName ?? "—",
            School = line.OrganizationName ?? "—",
            Mobile = line.MobileNo1 ?? "—",
            JoiningDate = FormatShortDate(line.DateOfWorkingStart),
            StaffType = line.StaffTypeName ?? "—",
            Role = line.UserRoleName ?? "—"
        }).ToList();

        return RdlcRenderer.Render(rdlcFileName, dataSetName, rows);
    }

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
