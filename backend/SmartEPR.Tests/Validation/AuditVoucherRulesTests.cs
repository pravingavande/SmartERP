using SmartEPR.Core.DTOs.Audit;
using SmartEPR.Core.Validation;
using Xunit;

namespace SmartEPR.Tests.Validation;

public sealed class AuditVoucherRulesTests
{
    private static SaveVoucherRequestDto ValidBankDeposit(
        long orgId = 12,
        long accountRegisterId = 3,
        string vType = "BD",
        long fyId = 5,
        IReadOnlyList<VoucherDetailLineRequestDto>? details = null) => new()
    {
        OrgID = orgId,
        AccountRegisterID = accountRegisterId,
        VType = vType,
        VCode = 1,
        VDate = new DateTime(2026, 7, 15),
        FyID = fyId,
        Details = details ??
        [
            new VoucherDetailLineRequestDto
            {
                SrNo = 1,
                LedgerHeadId = 101,
                LedgerHeadNarration = "SBI deposit",
                Amount = 2500.50m
            }
        ]
    };

    private static SaveVoucherRequestDto ValidBankWithdraw() =>
        ValidBankDeposit(
            vType: "BW",
            details:
            [
                new VoucherDetailLineRequestDto
                {
                    SrNo = 1,
                    LedgerHeadId = 101,
                    LedgerHeadNarration = "ATM withdraw",
                    Amount = 750m
                }
            ]);

    [Theory]
    [InlineData("BD", true)]
    [InlineData("bw", true)]
    [InlineData("R", false)]
    [InlineData("P", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void IsBankVoucherType_DetectsBdAndBw(string? vType, bool expected)
        => Assert.Equal(expected, AuditVoucherRules.IsBankVoucherType(vType));

    [Theory]
    [InlineData("BD", 1)]
    [InlineData("R", 1)]
    [InlineData("RV", 1)]
    [InlineData("BW", -1)]
    [InlineData("P", -1)]
    [InlineData("PV", -1)]
    [InlineData("XX", 0)]
    public void BalanceSign_MatchesRegisterRules(string vType, int expected)
        => Assert.Equal(expected, AuditVoucherRules.BalanceSign(vType));

    [Fact]
    public void ApplyToBalance_DepositIncreases_WithdrawDecreases()
    {
        var bal = 5000m;
        bal = AuditVoucherRules.ApplyToBalance(bal, "BD", 2000m);
        Assert.Equal(7000m, bal);
        bal = AuditVoucherRules.ApplyToBalance(bal, "BW", 750m);
        Assert.Equal(6250m, bal);
    }

    [Fact]
    public void ValidateSave_AcceptsValidBankDeposit()
        => Assert.Null(AuditVoucherRules.ValidateSave(ValidBankDeposit()));

    [Fact]
    public void ValidateSave_AcceptsValidBankWithdraw()
        => Assert.Null(AuditVoucherRules.ValidateSave(ValidBankWithdraw()));

    [Fact]
    public void ValidateSave_RejectsMissingOrganization()
        => Assert.Equal("Organization is required.", AuditVoucherRules.ValidateSave(ValidBankDeposit(orgId: 0)));

    [Fact]
    public void ValidateSave_RejectsMissingAccountRegister()
        => Assert.Equal(
            "Account Register is required.",
            AuditVoucherRules.ValidateSave(ValidBankDeposit(accountRegisterId: 0)));

    [Fact]
    public void ValidateSave_RejectsMissingVoucherType()
        => Assert.Equal("Voucher type is required.", AuditVoucherRules.ValidateSave(ValidBankDeposit(vType: "  ")));

    [Fact]
    public void ValidateSave_RejectsMissingFy()
        => Assert.Equal("Financial Year is required.", AuditVoucherRules.ValidateSave(ValidBankDeposit(fyId: 0)));

    [Fact]
    public void ValidateSave_RejectsEmptyDetails()
        => Assert.Equal(
            "At least one detail line is required.",
            AuditVoucherRules.ValidateSave(ValidBankDeposit(details: [])));

    [Fact]
    public void ValidateSave_RejectsNonPositiveTotal()
        => Assert.Equal(
            "Total amount must be greater than zero.",
            AuditVoucherRules.ValidateSave(ValidBankDeposit(details:
            [
                new VoucherDetailLineRequestDto { SrNo = 1, LedgerHeadId = 1, Amount = 0 }
            ])));

    [Fact]
    public void ValidateSave_BankVoucher_RejectsMultipleDetailLines()
        => Assert.Equal(
            "Bank Deposit / Withdraw must have exactly one ledger line.",
            AuditVoucherRules.ValidateSave(ValidBankDeposit(details:
            [
                new VoucherDetailLineRequestDto { SrNo = 1, LedgerHeadId = 1, Amount = 100 },
                new VoucherDetailLineRequestDto { SrNo = 2, LedgerHeadId = 2, Amount = 50 }
            ])));

    [Fact]
    public void ValidateSave_BankVoucher_RejectsMissingLedgerHead()
        => Assert.Equal(
            "Ledger Head is required.",
            AuditVoucherRules.ValidateSave(ValidBankDeposit(details:
            [
                new VoucherDetailLineRequestDto { SrNo = 1, LedgerHeadId = 0, Amount = 100 }
            ])));

    [Fact]
    public void ValidateSave_BankVoucher_AcceptsNegativeLedgerHeadId()
        => Assert.Null(AuditVoucherRules.ValidateSave(ValidBankDeposit(details:
        [
            new VoucherDetailLineRequestDto { SrNo = 1, LedgerHeadId = -2, LedgerHeadNarration = "Deposit", Amount = 10000 }
        ])));

    [Fact]
    public void ValidateSave_BankVoucher_RejectsNonPositiveLineAmount()
        => Assert.Equal(
            "Total amount must be greater than zero.",
            AuditVoucherRules.ValidateSave(ValidBankDeposit(
                vType: "BW",
                details: [new VoucherDetailLineRequestDto { SrNo = 1, LedgerHeadId = 101, Amount = -5 }])));

    [Fact]
    public void ValidateSave_ReceiptAllowsMultipleLines()
        => Assert.Null(AuditVoucherRules.ValidateSave(ValidBankDeposit(
            vType: "R",
            details:
            [
                new VoucherDetailLineRequestDto { SrNo = 1, LedgerHeadId = 1, Amount = 100 },
                new VoucherDetailLineRequestDto { SrNo = 2, LedgerHeadId = 2, Amount = 50 }
            ])));
}
