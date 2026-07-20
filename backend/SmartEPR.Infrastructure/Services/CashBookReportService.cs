using System.Globalization;
using Microsoft.Reporting.NETCore;
using SmartEPR.Core.DTOs.Reports;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Services;

/// <summary>
/// Cash Book (मुख्य किर्द) PDF — RDLC layout matching monthly Opening/Closing, To/By, Credit/Debit.
/// QuestPDF implementation is retained below (commented) for later reuse.
/// </summary>
public sealed class CashBookReportService : ICashBookReportService
{
    private static readonly CultureInfo InCulture = CultureInfo.CreateSpecificCulture("en-IN");

    private readonly ICashBookReportRepository _repository;
    private readonly IAuditVoucherRepository _auditRepository;

    public CashBookReportService(
        ICashBookReportRepository repository,
        IAuditVoucherRepository auditRepository)
    {
        _repository = repository;
        _auditRepository = auditRepository;
    }

    public async Task<byte[]?> RenderCashBookPdfAsync(CashBookReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        if (filter.OrgID <= 0 || filter.FromDate is null || filter.ToDate is null)
            return null;

        var accountRegisterId = await ResolveAccountRegisterIdAsync(filter, cancellationToken).ConfigureAwait(false);
        if (accountRegisterId <= 0)
            return null;

        var resolvedFilter = new CashBookReportFilterDto
        {
            OrgID = filter.OrgID,
            FromDate = filter.FromDate,
            ToDate = filter.ToDate,
            AccountRegisterID = accountRegisterId
        };

        var (header, lines) = await _repository.GetReportAsync(resolvedFilter, cancellationToken).ConfigureAwait(false);
        if (header is null) return null;

        var displayRows = BuildDisplayRows(header, lines);
        if (displayRows.Count == 0 && header.OpeningBalance == 0) return null;

        var orgName = header.OrganizationName?.Trim() ?? "—";
        var address = BuildAddress(header.Address, header.CityName);
        var fromText = FormatShortDate(header.FromDate ?? filter.FromDate.Value);
        var toText = FormatShortDate(header.ToDate ?? filter.ToDate.Value);
        var fyFrom = FormatLongDate(header.FromDate ?? filter.FromDate.Value);
        var fyTo = FormatLongDate(header.ToDate ?? filter.ToDate.Value);

        var reportRows = displayRows.Select(r => new CashBookReportRow
        {
            OrganizationHeader = $"{orgName} - (from {fyFrom} to {fyTo})",
            Address = address,
            ReportTitle = "Cash Book",
            PeriodRange = $"{fromText} to {toText}",
            DateText = r.DateText,
            DrCrPrefix = r.DrCrPrefix,
            Particulars = r.Particulars,
            CreditText = r.CreditText,
            DebitText = r.DebitText,
            VchNo = r.VchNo,
            VchType = r.VchType,
            IsBold = r.IsTotal || r.IsBalance ? "Y" : "N",
            ShowTopBorder = r.IsTotal || r.IsBalance ? "Y" : "N"
        }).ToList();

        // Ensure at least one header row when only opening/closing shell exists.
        if (reportRows.Count == 0)
        {
            reportRows.Add(new CashBookReportRow
            {
                OrganizationHeader = $"{orgName} - (from {fyFrom} to {fyTo})",
                Address = address,
                ReportTitle = "Cash Book",
                PeriodRange = $"{fromText} to {toText}"
            });
        }

        return RenderRdlc(reportRows);
    }

    /// <summary>
    /// When AccountRegisterID is not supplied, use the school's available register
    /// (prefer Cash Book / रोख किर्द by name; otherwise first active register for that org/sanstha).
    /// Hard-coding ID=1 fails after import because each sanstha gets its own AccountRegisterID.
    /// </summary>
    private async Task<long> ResolveAccountRegisterIdAsync(
        CashBookReportFilterDto filter,
        CancellationToken cancellationToken)
    {
        if (filter.AccountRegisterID > 0)
            return filter.AccountRegisterID;

        var registers = await _auditRepository
            .GetAccountRegistersAsync(filter.OrgID, cancellationToken)
            .ConfigureAwait(false);

        if (registers.Count == 0)
            return 0;

        var cashBook = registers.FirstOrDefault(r => IsCashBookRegisterName(r.AccountRegister));
        return cashBook?.AccountRegisterID ?? registers[0].AccountRegisterID;
    }

    private static bool IsCashBookRegisterName(string? name)
    {
        var text = (name ?? string.Empty).Trim();
        if (text.Length == 0) return false;
        // Prefer explicit cash-book labels (avoid matching every *किर्द* register).
        return text.Contains("रोख", StringComparison.Ordinal)
            || text.Contains("Cash Book", StringComparison.OrdinalIgnoreCase)
            || string.Equals(text, "Cash", StringComparison.OrdinalIgnoreCase);
    }

    private static byte[]? RenderRdlc(IReadOnlyList<CashBookReportRow> rows)
    {
        var reportPath = Path.Combine(AppContext.BaseDirectory, "Reports", "CashBookReport.rdlc");
        if (!File.Exists(reportPath) || rows.Count == 0) return null;

        using var definition = File.OpenRead(reportPath);
        var report = new LocalReport();
        report.LoadReportDefinition(definition);
        report.DataSources.Add(new ReportDataSource("CashBook", rows));
        return report.Render("PDF");
    }

    private static List<CashBookDisplayRow> BuildDisplayRows(CashBookHeaderDto header, IReadOnlyList<CashBookLineDto> lines)
    {
        var rows = new List<CashBookDisplayRow>();
        var balance = header.OpeningBalance;
        var ordered = lines
            .OrderBy(l => l.VDate ?? DateTime.MaxValue)
            .ThenBy(l => l.VoucherID)
            .ToList();

        var fromDate = (header.FromDate ?? DateTime.Today).Date;
        var groups = ordered.GroupBy(l =>
        {
            var d = l.VDate ?? DateTime.MinValue;
            return new DateTime(d.Year, d.Month, 1);
        }).OrderBy(g => g.Key).ToList();

        if (groups.Count == 0 && header.OpeningBalance != 0)
        {
            var month = new DateTime(fromDate.Year, fromDate.Month, 1);
            AppendMonth(rows, month, [], ref balance, openingDate: fromDate);
            return rows;
        }

        var first = true;
        foreach (var g in groups)
        {
            AppendMonth(rows, g.Key, g.ToList(), ref balance, openingDate: first ? fromDate : g.Key);
            first = false;
        }

        return rows;
    }

    private static void AppendMonth(
        List<CashBookDisplayRow> rows,
        DateTime monthStart,
        List<CashBookLineDto> monthLines,
        ref decimal balance,
        DateTime? openingDate = null)
    {
        var opening = balance;
        decimal monthCredit = 0;
        decimal monthDebit = 0;
        var openDate = openingDate ?? monthStart;

        rows.Add(new CashBookDisplayRow
        {
            DateText = FormatShortDate(openDate),
            DrCrPrefix = "To",
            Particulars = "Opening Balance",
            CreditText = FormatAmount(opening),
            DebitText = string.Empty,
            IsBalance = true
        });
        monthCredit += opening;

        DateTime? lastDate = null;
        foreach (var line in monthLines)
        {
            var isReceipt = IsReceipt(line.VType);
            var amount = line.Amount;
            if (isReceipt)
            {
                monthCredit += amount;
                balance += amount;
            }
            else
            {
                monthDebit += amount;
                balance -= amount;
            }

            var date = line.VDate;
            var showDate = date.HasValue && (!lastDate.HasValue || lastDate.Value.Date != date.Value.Date);
            lastDate = date;

            var head = string.IsNullOrWhiteSpace(line.LedgerHead) ? (line.LedgerHeadNarration ?? "—") : line.LedgerHead!;
            rows.Add(new CashBookDisplayRow
            {
                DateText = showDate && date.HasValue ? FormatShortDate(date.Value) : string.Empty,
                DrCrPrefix = isReceipt ? "To" : "By",
                Particulars = head.Trim(),
                CreditText = isReceipt ? FormatAmount(amount) : string.Empty,
                DebitText = isReceipt ? string.Empty : FormatAmount(amount),
                VchNo = line.VCode?.ToString() ?? string.Empty,
                VchType = isReceipt ? "Receipt" : "Payment"
            });
        }

        rows.Add(new CashBookDisplayRow
        {
            CreditText = FormatAmount(monthCredit),
            DebitText = FormatAmount(monthDebit),
            IsTotal = true
        });

        var closing = balance;
        rows.Add(new CashBookDisplayRow
        {
            DrCrPrefix = "By",
            Particulars = "Closing Balance",
            DebitText = FormatAmount(closing),
            IsBalance = true
        });

        var equal = monthCredit;
        rows.Add(new CashBookDisplayRow
        {
            CreditText = FormatAmount(equal),
            DebitText = FormatAmount(monthDebit + closing),
            IsTotal = true
        });
    }

    private static bool IsReceipt(string? vType)
    {
        var t = (vType ?? string.Empty).Trim().ToUpperInvariant();
        return t is "R" or "RECEIPT";
    }

    private static string FormatAmount(decimal value) =>
        value.ToString("#,##0.00", InCulture);

    private static string FormatShortDate(DateTime d) =>
        d.ToString("d-MMM-yy", CultureInfo.InvariantCulture);

    private static string FormatLongDate(DateTime d) =>
        d.ToString("d-MMM-yyyy", CultureInfo.InvariantCulture);

    private static string BuildAddress(string? address, string? city)
    {
        var parts = new[] { address?.Trim(), city?.Trim() }
            .Where(s => !string.IsNullOrWhiteSpace(s) && s != "1");
        return string.Join(", ", parts);
    }

    private sealed class CashBookDisplayRow
    {
        public string DateText { get; init; } = string.Empty;
        public string DrCrPrefix { get; init; } = string.Empty;
        public string Particulars { get; init; } = string.Empty;
        public string CreditText { get; init; } = string.Empty;
        public string DebitText { get; init; } = string.Empty;
        public string VchNo { get; init; } = string.Empty;
        public string VchType { get; init; } = string.Empty;
        public bool IsTotal { get; init; }
        public bool IsBalance { get; init; }
    }

    /*
    =============================================================================
    QUESTPDF IMPLEMENTATION (kept for later reuse — not active)
    Same layout: monthly Opening/Closing, To/By, Credit/Debit, Vch No./Type.
    =============================================================================

    using QuestPDF.Fluent;
    using QuestPDF.Helpers;
    using QuestPDF.Infrastructure;

    // In ctor: QuestPDF.Settings.License = LicenseType.Community;

    public async Task<byte[]?> RenderCashBookPdfAsync_QuestPdf(CashBookReportFilterDto filter, CancellationToken cancellationToken = default)
    {
        if (filter.OrgID <= 0 || filter.FromDate is null || filter.ToDate is null)
            return null;

        var (header, lines) = await _repository.GetReportAsync(filter, cancellationToken).ConfigureAwait(false);
        if (header is null) return null;

        var rows = BuildDisplayRows(header, lines);
        if (rows.Count == 0 && header.OpeningBalance == 0) return null;

        var orgName = header.OrganizationName?.Trim() ?? "—";
        var address = BuildAddress(header.Address, header.CityName);
        var fromText = FormatShortDate(header.FromDate ?? filter.FromDate.Value);
        var toText = FormatShortDate(header.ToDate ?? filter.ToDate.Value);
        var fyFrom = FormatLongDate(header.FromDate ?? filter.FromDate.Value);
        var fyTo = FormatLongDate(header.ToDate ?? filter.ToDate.Value);

        var document = Document.Create(container =>
        {
            container.Page(page =>
            {
                page.Size(PageSizes.A4);
                page.MarginTop(28);
                page.MarginBottom(28);
                page.MarginHorizontal(24);
                page.DefaultTextStyle(x => x.FontSize(9).FontFamily(Fonts.Calibri));

                page.Header().Column(col =>
                {
                    col.Item().AlignCenter().Text($"{orgName} - (from {fyFrom} to {fyTo})")
                        .SemiBold().FontSize(11);
                    if (!string.IsNullOrWhiteSpace(address))
                        col.Item().AlignCenter().Text(address).FontSize(9);
                    col.Item().PaddingTop(4).AlignCenter().Text("Cash Book").SemiBold().FontSize(12);
                    col.Item().Row(r =>
                    {
                        r.RelativeItem().AlignCenter().Text($"{fromText} to {toText}").FontSize(9);
                        r.ConstantItem(70).AlignRight().Text(text =>
                        {
                            text.Span("Page ").FontSize(8);
                            text.CurrentPageNumber().FontSize(8);
                        });
                    });
                    col.Item().PaddingTop(6).Element(DrawColumnHeader);
                });

                page.Content().PaddingTop(4).Column(col =>
                {
                    foreach (var row in rows)
                        col.Item().Element(e => DrawRow(e, row));
                });
            });
        });

        return document.GeneratePdf();
    }

    private static void DrawColumnHeader(IContainer container)
    {
        container.BorderBottom(1).BorderColor(Colors.Grey.Darken2).PaddingBottom(3).Row(r =>
        {
            r.ConstantItem(58).Text("Date").SemiBold();
            r.RelativeItem().Text("Particulars").SemiBold();
            r.ConstantItem(72).AlignRight().Text("Credit").SemiBold();
            r.ConstantItem(72).AlignRight().Text("Debit").SemiBold();
            r.ConstantItem(48).AlignRight().Text("Vch No.").SemiBold();
            r.ConstantItem(58).Text("Vch Type").SemiBold();
        });
    }

    private static void DrawRow(IContainer container, CashBookDisplayRow row)
    {
        var style = container.PaddingVertical(1.5f);
        if (row.IsTotal || row.IsBalance)
            style = style.BorderTop(0.5f).BorderColor(Colors.Grey.Medium);

        style.Row(r =>
        {
            var bold = row.IsTotal || row.IsBalance;
            r.ConstantItem(58).Text(t =>
            {
                var s = t.Span(row.DateText).FontSize(8.5f);
                if (bold) s.SemiBold();
            });
            r.RelativeItem().Text(text =>
            {
                if (!string.IsNullOrEmpty(row.DrCrPrefix))
                    text.Span(row.DrCrPrefix + "  ").SemiBold().FontSize(8.5f);
                var p = text.Span(row.Particulars).FontSize(8.5f);
                if (bold) p.SemiBold();
            });
            r.ConstantItem(72).AlignRight().Text(t =>
            {
                var s = t.Span(row.CreditText).FontSize(8.5f);
                if (bold) s.SemiBold();
            });
            r.ConstantItem(72).AlignRight().Text(t =>
            {
                var s = t.Span(row.DebitText).FontSize(8.5f);
                if (bold) s.SemiBold();
            });
            r.ConstantItem(48).AlignRight().Text(row.VchNo).FontSize(8.5f);
            r.ConstantItem(58).Text(row.VchType).FontSize(8.5f);
        });
    }
    */
}
