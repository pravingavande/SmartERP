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
    private readonly DonationReceiptOptions _receiptOptions;

    public DonationReportService(IDonationService donationService, IConfiguration configuration)
    {
        _donationService = donationService;
        _receiptOptions = ReadReceiptOptions(configuration);
    }

    public async Task<byte[]?> RenderDonationReceiptPdfAsync(long drId, CancellationToken cancellationToken = default)
    {
        var donation = await _donationService.GetByIdAsync(drId, cancellationToken).ConfigureAwait(false);
        if (donation is null) return null;

        var reportPath = Path.Combine(AppContext.BaseDirectory, "Reports", "DonationReceipt.rdlc");
        if (!File.Exists(reportPath)) return null;

        var row = MapToReportRow(donation);
        using var definition = File.OpenRead(reportPath);
        var report = new LocalReport();
        report.LoadReportDefinition(definition);
        report.DataSources.Add(new ReportDataSource("DonationReceipt", new[] { row }));
        report.EnableExternalImages = true;
        return report.Render("PDF");
    }

    private DonationReceiptReportRow MapToReportRow(DonationListItemDto d)
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
            AmountInWords = AmountInWords.ToIndianRupees(amount),
            AmountInWordsMarathi = AmountInWordsMarathi.ToIndianRupees(amount),
            Remark = string.IsNullOrWhiteSpace(d.Remark) ? "—" : d.Remark!,
            ReceiverSignatureName = _receiptOptions.ReceiverSignatureName,
            PrintedOn = DateTime.Now.ToString("dd-MMM-yyyy hh:mm tt")
        };
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
}
