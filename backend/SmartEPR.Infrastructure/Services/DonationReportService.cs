using Microsoft.Extensions.Configuration;
using Microsoft.Reporting.NETCore;
using SmartEPR.Core.Configuration;
using SmartEPR.Core.DTOs.Donation;
using SmartEPR.Core.DTOs.Reports;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Reports;

namespace SmartEPR.Infrastructure.Services;

public sealed class DonationReportService : IDonationReportService
{
    private readonly IDonationService _donationService;
    private readonly IDonationRepository _donationRepository;
    private readonly DonationReceiptOptions _receiptOptions;

    public DonationReportService(
        IDonationService donationService,
        IDonationRepository donationRepository,
        IConfiguration configuration)
    {
        _donationService = donationService;
        _donationRepository = donationRepository;
        _receiptOptions = ReadReceiptOptions(configuration);
    }

    public async Task<byte[]?> RenderDonationReceiptPdfAsync(long drId, CancellationToken cancellationToken = default)
    {
        var donation = await _donationService.GetByIdAsync(drId, cancellationToken).ConfigureAwait(false);
        if (donation is null) return null;

        var reportPath = Path.Combine(AppContext.BaseDirectory, "Reports", "DonationReceipt.rdlc");
        if (!File.Exists(reportPath)) return null;

        var row = MapReceiptRow(donation);
        return RenderReport(reportPath, new[] { row });
    }

    public async Task<byte[]?> RenderDonationDetailReportPdfAsync(DonationReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var rows = await LoadDetailReportRowsAsync(filter, cancellationToken).ConfigureAwait(false);
        if (rows.Count == 0) return null;
        return RenderReport(Path.Combine(AppContext.BaseDirectory, "Reports", "DonationDetailReport.rdlc"), rows);
    }

    public async Task<byte[]?> RenderDonationSchoolWiseDetailReportPdfAsync(DonationReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var rows = await LoadDetailReportRowsAsync(filter, cancellationToken).ConfigureAwait(false);
        if (rows.Count == 0) return null;
        return RenderReport(Path.Combine(AppContext.BaseDirectory, "Reports", "DonationSchoolWiseDetailReport.rdlc"), rows);
    }

    public async Task<byte[]?> RenderDonationUserWiseDetailReportPdfAsync(DonationReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        var source = await _donationRepository.GetReportUserSummaryAsync(filter, cancellationToken).ConfigureAwait(false);
        if (source.Count == 0) return null;

        var fromDate = FormatFilterDate(filter.FromDate);
        var toDate = FormatFilterDate(filter.ToDate);
        var printedOn = DateTime.Now.ToString("dd-MMM-yyyy hh:mm tt");
        var rows = source.Select(r => MapUserSummaryRow(r, fromDate, toDate, printedOn)).ToArray();
        return RenderReport(Path.Combine(AppContext.BaseDirectory, "Reports", "DonationDetailSummaryReport.rdlc"), rows);
    }

    private async Task<IReadOnlyList<DonationReceiptReportRow>> LoadDetailReportRowsAsync(
        DonationReportFilterDto filter,
        CancellationToken cancellationToken)
    {
        var source = await _donationRepository.GetReportDetailAsync(filter, cancellationToken).ConfigureAwait(false);
        if (source.Count == 0) return [];

        var fromDate = FormatFilterDate(filter.FromDate);
        var toDate = FormatFilterDate(filter.ToDate);
        var printedOn = DateTime.Now.ToString("dd-MMM-yyyy hh:mm tt");
        return source.Select(r => MapDetailRow(r, fromDate, toDate, printedOn)).ToArray();
    }

    private static byte[]? RenderReport(string reportPath, IReadOnlyList<DonationReceiptReportRow> rows)
    {
        if (!File.Exists(reportPath) || rows.Count == 0) return null;

        using var definition = File.OpenRead(reportPath);
        var report = new LocalReport();
        report.LoadReportDefinition(definition);
        report.DataSources.Add(new ReportDataSource("DonationReceipt", rows));
        report.EnableExternalImages = true;
        return report.Render("PDF");
    }

    private DonationReceiptReportRow MapReceiptRow(DonationListItemDto d)
    {
        var amount = d.Amount ?? 0m;
        var isCheque = (d.PaymentType ?? string.Empty).Contains("cheque", StringComparison.OrdinalIgnoreCase);
        var tid = d.OrgIDReceiptNo?.ToString() ?? d.ReceiptNo?.ToString() ?? "—";

        return new DonationReceiptReportRow
        {
            ReceiptNo = d.ReceiptNo?.ToString() ?? "—",
            OrgReceiptNo = d.OrgIDReceiptNo?.ToString() ?? "—",
            Tid = tid,
            ReceiptDate = FormatDate(d.ReceiptDate),
            OrganizationName = d.OrganizationName ?? "—",
            SansthaName = d.OrganizationName ?? "—",
            SansthaAddress = string.IsNullOrWhiteSpace(_receiptOptions.SansthaAddress) ? "—" : _receiptOptions.SansthaAddress,
            EstablishmentYear = _receiptOptions.EstablishmentYear,
            OrgPanNo = _receiptOptions.OrgPanNo,
            RegistrationNo = _receiptOptions.RegistrationNo,
            OrderNo80G = _receiptOptions.OrderNo80G,
            OrderDate80G = _receiptOptions.OrderDate80G,
            FyName = d.FyName ?? "—",
            DRHeadName = d.DRHeadName ?? "—",
            DonorName = d.DonorName ?? "—",
            MobileNo = d.MobileNo ?? "—",
            PanNo = d.PanNo ?? "—",
            AadharNo = d.AadharNo ?? "—",
            Address = d.Address ?? "—",
            PaymentType = d.PaymentType ?? "—",
            BankName = isCheque ? d.BankName ?? "—" : "—",
            TransactionNo = d.TransactionNo ?? "—",
            TransactionDate = FormatDate(d.TransactionDate),
            DepositDate = FormatDate(d.DepositDate),
            DepositBankName = isCheque ? d.DepositBankName ?? "—" : "—",
            AmountText = AmountInWords.FormatCurrency(amount),
            AmountNumber = amount.ToString("N2", System.Globalization.CultureInfo.CreateSpecificCulture("en-IN")),
            AmountValue = amount,
            AmountInWords = AmountInWords.ToIndianRupees(amount),
            AmountInWordsMarathi = AmountInWordsMarathi.ToIndianRupees(amount),
            Remark = string.IsNullOrWhiteSpace(d.Remark) ? "—" : d.Remark!,
            ReceiverSignatureName = _receiptOptions.ReceiverSignatureName,
            PrintedOn = DateTime.Now.ToString("dd-MMM-yyyy hh:mm tt")
        };
    }

    private DonationReceiptReportRow MapDetailRow(
        DonationReportDetailRowDto d,
        string fromDate,
        string toDate,
        string printedOn)
    {
        var amount = d.Amount ?? 0m;
        var userName = ResolveUserName(d.EmployeeName, d.EmployeeShortName);
        var sansthaName = string.IsNullOrWhiteSpace(d.SansthaName) ? d.OrganizationName ?? "—" : d.SansthaName!;
        var sansthaAddress = string.IsNullOrWhiteSpace(d.SansthaAddress) ? "—" : d.SansthaAddress!;

        return new DonationReceiptReportRow
        {
            ReceiptNo = d.ReceiptNo?.ToString() ?? "—",
            OrgReceiptNo = d.OrgIDReceiptNo?.ToString() ?? d.ReceiptNo?.ToString() ?? "—",
            Tid = d.OrgIDReceiptNo?.ToString() ?? d.ReceiptNo?.ToString() ?? "—",
            ReceiptDate = FormatDate(d.ReceiptDate),
            OrganizationName = d.OrganizationName ?? "—",
            SansthaName = sansthaName,
            SansthaAddress = sansthaAddress,
            EstablishmentYear = d.EstablishmentYear ?? _receiptOptions.EstablishmentYear,
            OrgPanNo = _receiptOptions.OrgPanNo,
            RegistrationNo = string.IsNullOrWhiteSpace(d.RegNo) ? _receiptOptions.RegistrationNo : d.RegNo!,
            OrderNo80G = string.IsNullOrWhiteSpace(d.Permission80G) ? _receiptOptions.OrderNo80G : d.Permission80G!,
            OrderDate80G = _receiptOptions.OrderDate80G,
            FyName = d.FyName ?? "—",
            DRHeadName = d.DRHeadName ?? "—",
            DonorName = d.DonorName ?? "—",
            MobileNo = d.MobileNo ?? "—",
            PanNo = d.PanNo ?? "—",
            AadharNo = d.AadharNo ?? "—",
            Address = d.Address ?? "—",
            PaymentType = d.PaymentType ?? "—",
            BankName = d.BankName ?? "—",
            TransactionNo = d.TransactionNo ?? "—",
            TransactionDate = FormatDate(d.TransactionDate),
            DepositDate = FormatDate(d.DepositDate),
            DepositBankName = "—",
            AmountText = AmountInWords.FormatCurrency(amount),
            AmountNumber = amount.ToString("N2", System.Globalization.CultureInfo.CreateSpecificCulture("en-IN")),
            AmountValue = amount,
            AmountInWords = AmountInWords.ToIndianRupees(amount),
            AmountInWordsMarathi = AmountInWordsMarathi.ToIndianRupees(amount),
            Remark = string.IsNullOrWhiteSpace(d.Remark) ? "—" : d.Remark!,
            UserName = userName,
            TotalReceipts = "1",
            FromDate = fromDate,
            ToDate = toDate,
            PrintedOn = printedOn
        };
    }

    private DonationReceiptReportRow MapUserSummaryRow(
        DonationReportUserSummaryRowDto d,
        string fromDate,
        string toDate,
        string printedOn)
    {
        var amount = d.Amount ?? 0m;
        var sansthaName = string.IsNullOrWhiteSpace(d.SansthaName) ? d.OrganizationName ?? "—" : d.SansthaName!;
        var sansthaAddress = string.IsNullOrWhiteSpace(d.SansthaAddress) ? "—" : d.SansthaAddress!;

        return new DonationReceiptReportRow
        {
            ReceiptNo = d.ReceiptNo?.ToString() ?? "—",
            OrgReceiptNo = d.ReceiptNo?.ToString() ?? "—",
            Tid = d.ReceiptNo?.ToString() ?? "—",
            ReceiptDate = "—",
            OrganizationName = d.OrganizationName ?? "—",
            SansthaName = sansthaName,
            SansthaAddress = sansthaAddress,
            EstablishmentYear = d.EstablishmentYear ?? _receiptOptions.EstablishmentYear,
            OrgPanNo = _receiptOptions.OrgPanNo,
            RegistrationNo = string.IsNullOrWhiteSpace(d.RegNo) ? _receiptOptions.RegistrationNo : d.RegNo!,
            OrderNo80G = string.IsNullOrWhiteSpace(d.Permission80G) ? _receiptOptions.OrderNo80G : d.Permission80G!,
            OrderDate80G = _receiptOptions.OrderDate80G,
            FyName = "—",
            DRHeadName = "—",
            DonorName = "—",
            MobileNo = "—",
            PanNo = "—",
            AadharNo = "—",
            Address = "—",
            PaymentType = d.PaymentType ?? "—",
            BankName = "—",
            TransactionNo = "—",
            TransactionDate = "—",
            DepositDate = "—",
            DepositBankName = "—",
            AmountText = AmountInWords.FormatCurrency(amount),
            AmountNumber = amount.ToString("N2", System.Globalization.CultureInfo.CreateSpecificCulture("en-IN")),
            AmountValue = amount,
            AmountInWords = AmountInWords.ToIndianRupees(amount),
            AmountInWordsMarathi = AmountInWordsMarathi.ToIndianRupees(amount),
            Remark = string.IsNullOrWhiteSpace(d.Remark) ? "—" : d.Remark!,
            UserName = ResolveUserName(d.EmployeeName, null),
            TotalReceipts = d.TotalReceipts.ToString(),
            FromDate = fromDate,
            ToDate = toDate,
            PrintedOn = printedOn
        };
    }

    private static string ResolveUserName(string? employeeName, string? employeeShortName)
    {
        if (!string.IsNullOrWhiteSpace(employeeName)) return employeeName.Trim();
        if (!string.IsNullOrWhiteSpace(employeeShortName)) return employeeShortName.Trim();
        return "—";
    }

    private static DonationReceiptOptions ReadReceiptOptions(IConfiguration configuration)
    {
        var section = configuration.GetSection(DonationReceiptOptions.SectionName);
        return new DonationReceiptOptions
        {
            EstablishmentYear = section["EstablishmentYear"] ?? string.Empty,
            OrgPanNo = section["OrgPanNo"] ?? string.Empty,
            RegistrationNo = section["RegistrationNo"] ?? string.Empty,
            OrderNo80G = section["OrderNo80G"] ?? string.Empty,
            OrderDate80G = section["OrderDate80G"] ?? string.Empty,
            SansthaAddress = section["SansthaAddress"] ?? string.Empty,
            ReceiverSignatureName = section["ReceiverSignatureName"] ?? string.Empty
        };
    }

    private static string FormatDate(DateTime? value) =>
        value?.ToString("dd.MM.yyyy") ?? "—";

    private static string FormatFilterDate(DateTime? value) =>
        value?.ToString("dd-MMM-yyyy") ?? "—";
}
