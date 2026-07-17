namespace SmartEPR.Core.DTOs.Reports;

public sealed class CashBookReportFilterDto
{
    public long OrgID { get; init; }
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
    public long AccountRegisterID { get; init; } = 1;
}

public sealed class CashBookHeaderDto
{
    public long OrgID { get; init; }
    public string? OrganizationName { get; init; }
    public string? Address { get; init; }
    public string? CityName { get; init; }
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
    public decimal OpeningBalance { get; init; }
    public string? AccountRegister { get; init; }
}

public sealed class CashBookLineDto
{
    public long VoucherID { get; init; }
    public long OrgID { get; init; }
    public string? OrganizationName { get; init; }
    public string? AccountRegister { get; init; }
    public string? VType { get; init; }
    public long? VCode { get; init; }
    public DateTime? VDate { get; init; }
    public string? LedgerHead { get; init; }
    public string? LedgerHeadNarration { get; init; }
    public decimal Amount { get; init; }
}

/// <summary>RDLC row for Cash Book (मुख्य किर्द) — header fields repeated on each line.</summary>
public sealed class CashBookReportRow
{
    public string OrganizationHeader { get; init; } = string.Empty;
    public string Address { get; init; } = string.Empty;
    public string ReportTitle { get; init; } = "Cash Book";
    public string PeriodRange { get; init; } = string.Empty;
    public string DateText { get; init; } = string.Empty;
    public string DrCrPrefix { get; init; } = string.Empty;
    public string Particulars { get; init; } = string.Empty;
    public string CreditText { get; init; } = string.Empty;
    public string DebitText { get; init; } = string.Empty;
    public string VchNo { get; init; } = string.Empty;
    public string VchType { get; init; } = string.Empty;
    /// <summary>"Y" for Opening/Closing/Total rows.</summary>
    public string IsBold { get; init; } = "N";
    /// <summary>"Y" draws a top border (totals / balances).</summary>
    public string ShowTopBorder { get; init; } = "N";
}
