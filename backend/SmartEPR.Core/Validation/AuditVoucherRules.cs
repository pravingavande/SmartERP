using SmartEPR.Core.DTOs.Audit;

namespace SmartEPR.Core.Validation;

/// <summary>
/// Shared rules for Audit vouchers including Bank Deposit (BD) and Bank Withdraw (BW).
/// </summary>
public static class AuditVoucherRules
{
    public const int EmployeeUserRoleId = 3;

    public static bool IsPaymentOrReceiptVoucherType(string? vType)
    {
        var t = (vType ?? string.Empty).Trim().ToUpperInvariant();
        return t is "P" or "PV" or "R" or "RV";
    }

    /// <summary>
    /// School users (role 3) may edit/delete payment & receipt vouchers only when voucher date is today.
    /// </summary>
    public static string? ValidateEmployeeSameDayModify(int? userRoleId, string? vType, DateTime voucherDate, DateTime today)
    {
        if (userRoleId != EmployeeUserRoleId)
            return null;
        if (!IsPaymentOrReceiptVoucherType(vType))
            return null;
        if (voucherDate.Date != today.Date)
            return "You cannot edit or delete vouchers except on the same day as the voucher date.";
        return null;
    }

    public static bool IsBankVoucherType(string? vType)
    {
        var t = (vType ?? string.Empty).Trim().ToUpperInvariant();
        return t is "BD" or "BW";
    }

    /// <summary>
    /// Balance impact on Account Register: BD/R/RV = +1, BW/P/PV = -1, else 0.
    /// </summary>
    public static int BalanceSign(string? vType)
    {
        var t = (vType ?? string.Empty).Trim().ToUpperInvariant();
        return t switch
        {
            "BD" or "R" or "RV" => 1,
            "BW" or "P" or "PV" => -1,
            _ => 0
        };
    }

    public static decimal ApplyToBalance(decimal currentBalance, string? vType, decimal amount)
        => currentBalance + BalanceSign(vType) * amount;

    /// <summary>
    /// Insert validation (new voucher). VoucherID should be null/0.
    /// </summary>
    public static string? ValidateSave(SaveVoucherRequestDto request)
        => ValidateCommon(request);

    /// <summary>
    /// Update validation — same field rules as save, plus existing VoucherID required.
    /// </summary>
    public static string? ValidateUpdate(SaveVoucherRequestDto request)
    {
        if (request.VoucherID is null or <= 0)
            return "Voucher is required.";
        return ValidateCommon(request);
    }

    /// <summary>
    /// Routes to ValidateUpdate when VoucherID is present; otherwise ValidateSave.
    /// </summary>
    public static string? ValidateSaveOrUpdate(SaveVoucherRequestDto request)
        => request.VoucherID is > 0 ? ValidateUpdate(request) : ValidateSave(request);

    private static string? ValidateCommon(SaveVoucherRequestDto request)
    {
        if (request.OrgID <= 0)
            return "Organization is required.";
        if (request.AccountRegisterID <= 0)
            return "Account Register is required.";
        if (string.IsNullOrWhiteSpace(request.VType))
            return "Voucher type is required.";
        if (request.FyID <= 0)
            return "Financial Year is required.";
        if (request.Details is null || request.Details.Count == 0)
            return "At least one detail line is required.";
        if (request.Details.Sum(d => d.Amount) <= 0)
            return "Total amount must be greater than zero.";

        if (IsBankVoucherType(request.VType))
        {
            if (request.Details.Count != 1)
                return "Bank Deposit / Withdraw must have exactly one ledger line.";
            // Live ACLedgerHeadMaster can use negative LedgerHeadID for bank accounts (e.g. -2).
            if (request.Details[0].LedgerHeadId == 0)
                return "Ledger Head is required.";
            if (request.Details[0].Amount <= 0)
                return "Amount must be greater than zero.";
        }

        return null;
    }
}
