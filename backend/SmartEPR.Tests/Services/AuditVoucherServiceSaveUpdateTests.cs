using Moq;
using SmartEPR.Core.DTOs.Audit;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

/// <summary>
/// Service-level Save vs Update validation for audit vouchers.
/// </summary>
public sealed class AuditVoucherServiceSaveUpdateTests
{
    private readonly Mock<IAuditVoucherRepository> _repository = new();

    private AuditVoucherService CreateService() => new(_repository.Object);

    private static SaveVoucherRequestDto ValidInsert() => new()
    {
        OrgID = 12,
        AccountRegisterID = 3,
        VType = "BD",
        VCode = 1,
        VDate = new DateTime(2026, 7, 15),
        FyID = 5,
        Details =
        [
            new VoucherDetailLineRequestDto { SrNo = 1, LedgerHeadId = 101, Amount = 2500m }
        ]
    };

    private static SaveVoucherRequestDto ValidUpdate(long voucherId = 88) => new()
    {
        VoucherID = voucherId,
        OrgID = 12,
        AccountRegisterID = 3,
        VType = "BD",
        VCode = 1,
        VDate = new DateTime(2026, 7, 15),
        FyID = 5,
        Details =
        [
            new VoucherDetailLineRequestDto { SrNo = 1, LedgerHeadId = 101, Amount = 3000m }
        ]
    };

    private static VoucherDto SavedVoucher(long voucherId) => new()
    {
        VoucherID = voucherId,
        OrgID = 12,
        AccountRegisterID = 3,
        VType = "BD",
        TotalAmount = 2500m,
        FyID = 5
    };

    [Fact]
    public async Task SaveVoucherAsync_Insert_RejectsInvalidBeforeRepository()
    {
        var bad = new SaveVoucherRequestDto
        {
            OrgID = 0,
            AccountRegisterID = 3,
            VType = "BD",
            FyID = 5,
            Details = [new VoucherDetailLineRequestDto { SrNo = 1, LedgerHeadId = 1, Amount = 10 }]
        };

        var result = await CreateService().SaveVoucherAsync(1, bad);

        Assert.Null(result);
        _repository.Verify(
            r => r.SaveVoucherAsync(It.IsAny<long>(), It.IsAny<SaveVoucherRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SaveVoucherAsync_Insert_CallsRepositoryAndReloads()
    {
        _repository
            .Setup(r => r.SaveVoucherAsync(7, It.IsAny<SaveVoucherRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(50);
        _repository
            .Setup(r => r.GetVoucherByIdAsync(50, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SavedVoucher(50));

        var result = await CreateService().SaveVoucherAsync(7, ValidInsert());

        Assert.NotNull(result);
        Assert.Equal(50, result!.VoucherID);
        _repository.Verify(r => r.SaveVoucherAsync(7, It.Is<SaveVoucherRequestDto>(d => d.VoucherID == null || d.VoucherID == 0), It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task SaveVoucherAsync_Update_RejectsMissingVoucherIdFields_StillRequiresValidPayload()
    {
        // VoucherID present but org missing → update validation fails before repo
        var badUpdate = new SaveVoucherRequestDto
        {
            VoucherID = 88,
            OrgID = 0,
            AccountRegisterID = 3,
            VType = "BD",
            FyID = 5,
            Details = [new VoucherDetailLineRequestDto { SrNo = 1, LedgerHeadId = 1, Amount = 10 }]
        };

        var result = await CreateService().SaveVoucherAsync(7, badUpdate);

        Assert.Null(result);
        _repository.Verify(
            r => r.SaveVoucherAsync(It.IsAny<long>(), It.IsAny<SaveVoucherRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SaveVoucherAsync_Update_CallsRepositoryWithVoucherId()
    {
        SaveVoucherRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveVoucherAsync(7, It.IsAny<SaveVoucherRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<long, SaveVoucherRequestDto, CancellationToken>((_, dto, _) => captured = dto)
            .ReturnsAsync(88);
        _repository
            .Setup(r => r.GetVoucherByIdAsync(88, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SavedVoucher(88));

        var result = await CreateService().SaveVoucherAsync(7, ValidUpdate(88));

        Assert.NotNull(result);
        Assert.Equal(88, captured?.VoucherID);
        Assert.Equal(3000m, captured?.Details[0].Amount);
    }
}
