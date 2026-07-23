namespace SmartEPR.Core.DTOs.Reports;

public sealed class ModuleReportFilterDto
{
    public long? OrgID { get; init; }
    public long? SansthaID { get; init; }
    public long? LedgerHeadID { get; init; }
    public bool AllLedgerHeads { get; init; }
    public long? ItemGroupID { get; init; }
    public DateTime? FromDate { get; init; }
    public DateTime? ToDate { get; init; }
}

public sealed class ModuleReportHeaderDto
{
    public long OrgID { get; init; }
    public string? OrganizationName { get; init; }
    public string? Address { get; init; }
    public string? CityName { get; init; }
    public string? SansthaName { get; init; }
    public string? SansthaAddress { get; init; }
    public string? ScopeName { get; init; }
}

public sealed class VoucherLedgerLineDto
{
    public string? LedgerHead { get; init; }
    public long LedgerHeadID { get; init; }
    public DateTime? VDate { get; init; }
    public long? VCode { get; init; }
    public string? VType { get; init; }
    public string? LedgerHeadNarration { get; init; }
    public decimal Amount { get; init; }
    public long VoucherID { get; init; }
}

public sealed class TrialBalanceLineDto
{
    public string? LedgerHead { get; init; }
    public decimal OpeningBalance { get; init; }
    public decimal Debit { get; init; }
    public decimal Credit { get; init; }
    public decimal ClosingBalance { get; init; }
}

public sealed class SchoolDetailsLineDto
{
    public int? SrNo { get; init; }
    public string? OrganizationName { get; init; }
    public string? BusinessCategoryName { get; init; }
    public string? SchoolCategoryName { get; init; }
    public string? Address { get; init; }
    public string? CityName { get; init; }
    public string? UDiesNo { get; init; }
    public string? SharlarthID { get; init; }
    public string? SchoolTinNo { get; init; }
    public string? PanNo { get; init; }
    public string? PhoneNo { get; init; }
    public string? MobileNo { get; init; }
    public string? EmailID { get; init; }
    public string? EstablishmentYear { get; init; }
    public string? RegNo { get; init; }
    public string? Permission80G { get; init; }
    public string? StatusText { get; init; }
}

public sealed class UserDetailLineDto
{
    public int? SrNo { get; init; }
    public string? EmployeeName { get; init; }
    public string? DesignationName { get; init; }
    public string? OrganizationName { get; init; }
    public string? SansthaName { get; init; }
    public string? MobileNo1 { get; init; }
    public string? EmailID { get; init; }
    public string? ShalarthID { get; init; }
    public DateTime? DateOfWorkingStart { get; init; }
    public DateTime? ServiceOutDate { get; init; }
    public string? StaffTypeName { get; init; }
    public string? UserRoleName { get; init; }
}

public sealed class InwardRegisterLineDto
{
    public int? RecordNo { get; init; }
    public DateTime? IRDate { get; init; }
    public string? FileNo { get; init; }
    public string? LetterNo { get; init; }
    public string? FromWhomReceived { get; init; }
    public string? Subject { get; init; }
    public string? ToWhomIssued { get; init; }
    public string? OrganizationName { get; init; }
    public string? Remark { get; init; }
}

public sealed class OutwardRegisterLineDto
{
    public int? RecordNo { get; init; }
    public DateTime? ORDate { get; init; }
    public string? FileNo { get; init; }
    public string? Subject { get; init; }
    public string? Address { get; init; }
    public string? Enclosures { get; init; }
    public string? OrganizationName { get; init; }
    public string? Remark { get; init; }
}

public sealed class StockRegisterLineDto
{
    public string? ItemGroupName { get; init; }
    public string? ItemName { get; init; }
    public decimal OpeningQty { get; init; }
    public decimal InwardQty { get; init; }
    public decimal OutwardQty { get; init; }
    public decimal ClosingQty { get; init; }
}

/// <summary>Shared RDLC row for tabular module reports.</summary>
public sealed class TabularReportRow
{
    public string OrganizationHeader { get; init; } = string.Empty;
    public string Address { get; init; } = string.Empty;
    public string ReportTitle { get; init; } = string.Empty;
    public string FilterText { get; init; } = string.Empty;
    public string PrintedOn { get; init; } = string.Empty;
    public string GroupKey { get; init; } = string.Empty;
    public string GroupTitle { get; init; } = string.Empty;
    public string ColHeader1 { get; init; } = string.Empty;
    public string ColHeader2 { get; init; } = string.Empty;
    public string ColHeader3 { get; init; } = string.Empty;
    public string ColHeader4 { get; init; } = string.Empty;
    public string ColHeader5 { get; init; } = string.Empty;
    public string ColHeader6 { get; init; } = string.Empty;
    public string ColHeader7 { get; init; } = string.Empty;
    public string ColHeader8 { get; init; } = string.Empty;
    public string Col1 { get; init; } = string.Empty;
    public string Col2 { get; init; } = string.Empty;
    public string Col3 { get; init; } = string.Empty;
    public string Col4 { get; init; } = string.Empty;
    public string Col5 { get; init; } = string.Empty;
    public string Col6 { get; init; } = string.Empty;
    public string Col7 { get; init; } = string.Empty;
    public string Col8 { get; init; } = string.Empty;
    public string IsBold { get; init; } = "N";
    public string ShowTopBorder { get; init; } = "N";
}
