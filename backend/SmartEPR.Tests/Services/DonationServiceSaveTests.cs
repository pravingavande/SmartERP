using Moq;
using SmartEPR.Core.DTOs.Donation;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

/// <summary>
/// Donation entry save validation + audit field round-trip from repository (script 067).
/// Created*/Modified* are written in SQL; service must pass userId and surface audit fields on reload.
/// </summary>
public sealed class DonationServiceSaveTests
{
    private readonly Mock<IDonationRepository> _donationRepository = new();
    private readonly Mock<IAuditVoucherRepository> _auditRepository = new();

    private DonationService CreateService() => new(_donationRepository.Object, _auditRepository.Object);

    private static SaveDonationRequestDto ValidRequest(string donor = "Ramesh Patil", decimal amount = 500) => new()
    {
        ReceiptDate = new DateTime(2026, 4, 1),
        DRHeadID = 1,
        DonorName = donor,
        Amount = amount,
        FyID = 1,
        OrgID = 2
    };

    private static DonationListItemDto SavedDonation(long userId = 42) => new()
    {
        DrID = 100,
        DonorName = "Ramesh Patil",
        Amount = 500,
        OrgID = 2,
        FyID = 1,
        CreatedDate = new DateTime(2026, 4, 1, 10, 0, 0),
        ModifiedDate = new DateTime(2026, 4, 1, 10, 0, 0),
        CreatedUserID = userId,
        ModifiedUserID = userId
    };

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task SaveAsync_RejectsBlankDonorName(string? donor)
    {
        var result = await CreateService().SaveAsync(42, ValidRequest(donor: donor!));

        Assert.Null(result);
        _donationRepository.Verify(
            r => r.SaveAsync(It.IsAny<long>(), It.IsAny<SaveDonationRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-10)]
    public async Task SaveAsync_RejectsNonPositiveAmount(decimal amount)
    {
        var result = await CreateService().SaveAsync(42, ValidRequest(amount: amount));

        Assert.Null(result);
        _donationRepository.Verify(
            r => r.SaveAsync(It.IsAny<long>(), It.IsAny<SaveDonationRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SaveAsync_PassesUserIdToRepository_ForAuditColumns()
    {
        long capturedUserId = 0;
        _donationRepository
            .Setup(r => r.SaveAsync(It.IsAny<long>(), It.IsAny<SaveDonationRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<long, SaveDonationRequestDto, CancellationToken>((uid, _, _) => capturedUserId = uid)
            .ReturnsAsync(100);
        _donationRepository
            .Setup(r => r.GetByIdAsync(100, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SavedDonation(99));

        var result = await CreateService().SaveAsync(99, ValidRequest());

        Assert.NotNull(result);
        Assert.Equal(99, capturedUserId);
        Assert.Equal(99, result!.CreatedUserID);
        Assert.Equal(99, result.ModifiedUserID);
        Assert.NotNull(result.CreatedDate);
        Assert.NotNull(result.ModifiedDate);
    }

    [Fact]
    public async Task SaveAsync_OnUpdate_SurfacesModifiedAuditFieldsFromRepository()
    {
        var updated = new DonationListItemDto
        {
            DrID = 100,
            DonorName = "Ramesh Patil",
            Amount = 750,
            CreatedDate = new DateTime(2026, 3, 1, 9, 0, 0),
            ModifiedDate = new DateTime(2026, 4, 15, 14, 30, 0),
            CreatedUserID = 10,
            ModifiedUserID = 55
        };

        _donationRepository
            .Setup(r => r.SaveAsync(55, It.IsAny<SaveDonationRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(100);
        _donationRepository
            .Setup(r => r.GetByIdAsync(100, It.IsAny<CancellationToken>()))
            .ReturnsAsync(updated);

        var request = new SaveDonationRequestDto
        {
            DrID = 100,
            ReceiptDate = new DateTime(2026, 4, 1),
            DRHeadID = 1,
            DonorName = "Ramesh Patil",
            Amount = 750,
            FyID = 1,
            OrgID = 2
        };
        var result = await CreateService().SaveAsync(55, request);

        Assert.NotNull(result);
        Assert.Equal(10, result!.CreatedUserID);
        Assert.Equal(55, result.ModifiedUserID);
        Assert.Equal(new DateTime(2026, 3, 1, 9, 0, 0), result.CreatedDate);
        Assert.Equal(new DateTime(2026, 4, 15, 14, 30, 0), result.ModifiedDate);
    }

    [Fact]
    public async Task DeleteAsync_CallsRepository()
    {
        _donationRepository
            .Setup(r => r.DeleteAsync(100, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var ok = await CreateService().DeleteAsync(100);

        Assert.True(ok);
        _donationRepository.Verify(r => r.DeleteAsync(100, It.IsAny<CancellationToken>()), Times.Once);
    }
}
