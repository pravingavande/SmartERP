using Moq;
using SmartEPR.Core.DTOs.Audit;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class AuditVoucherServicePartyLedgerTests
{
    private readonly Mock<IAuditVoucherRepository> _repository = new();

    private AuditVoucherService CreateService() => new(_repository.Object);

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task SavePartyAsync_RejectsBlankName(string? name)
    {
        var result = await CreateService().SavePartyAsync(new SavePartyRequestDto
        {
            OrgID = 1,
            PartyName = name!
        });

        Assert.Null(result);
        _repository.Verify(
            r => r.SavePartyAsync(It.IsAny<SavePartyRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SavePartyAsync_Insert_CallsRepositoryAndReloads()
    {
        _repository
            .Setup(r => r.SavePartyAsync(It.IsAny<SavePartyRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(7);
        _repository
            .Setup(r => r.GetPartyByIdAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PartyMasterDto { PartyID = 7, OrgID = 1, PartyName = "Vendor A", IsActive = true });

        var result = await CreateService().SavePartyAsync(new SavePartyRequestDto
        {
            OrgID = 1,
            PartyName = "Vendor A"
        });

        Assert.NotNull(result);
        Assert.Equal(7, result!.PartyID);
    }

    [Fact]
    public async Task SavePartyAsync_Update_PassesPartyId()
    {
        SavePartyRequestDto? captured = null;
        _repository
            .Setup(r => r.SavePartyAsync(It.IsAny<SavePartyRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SavePartyRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(7);
        _repository
            .Setup(r => r.GetPartyByIdAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PartyMasterDto { PartyID = 7, OrgID = 1, PartyName = "Vendor B", IsActive = true });

        await CreateService().SavePartyAsync(new SavePartyRequestDto
        {
            PartyID = 7,
            OrgID = 1,
            PartyName = "Vendor B"
        });

        Assert.Equal(7, captured?.PartyID);
    }

    [Theory]
    [InlineData(0, "Head", 1)]
    [InlineData(1, "", 1)]
    [InlineData(1, "   ", 1)]
    [InlineData(1, "Head", 0)]
    public async Task SaveLedgerHeadAsync_RejectsInvalidPayload(long underOrgId, string name, long ledgerTypeId)
    {
        var result = await CreateService().SaveLedgerHeadAsync(new SaveLedgerHeadRequestDto
        {
            UnderOrgID = underOrgId,
            LedgerHead = name,
            LedgerTypeID = ledgerTypeId
        });

        Assert.Null(result);
        _repository.Verify(
            r => r.SaveLedgerHeadAsync(It.IsAny<SaveLedgerHeadRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SaveLedgerHeadAsync_Insert_CallsRepositoryAndReloads()
    {
        _repository
            .Setup(r => r.SaveLedgerHeadAsync(It.IsAny<SaveLedgerHeadRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(12);
        _repository
            .Setup(r => r.GetLedgerHeadByIdAsync(12, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LedgerHeadMasterDto
            {
                LedgerHeadID = 12,
                UnderOrgID = 1,
                LedgerHead = "Fees",
                LedgerTypeID = 2,
                IsActive = true
            });

        var result = await CreateService().SaveLedgerHeadAsync(new SaveLedgerHeadRequestDto
        {
            UnderOrgID = 1,
            LedgerHead = "Fees",
            LedgerTypeID = 2
        });

        Assert.NotNull(result);
        Assert.Equal(12, result!.LedgerHeadID);
    }

    [Fact]
    public async Task SaveLedgerHeadAsync_Update_PassesLedgerHeadId()
    {
        SaveLedgerHeadRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveLedgerHeadAsync(It.IsAny<SaveLedgerHeadRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveLedgerHeadRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(12);
        _repository
            .Setup(r => r.GetLedgerHeadByIdAsync(12, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LedgerHeadMasterDto
            {
                LedgerHeadID = 12,
                UnderOrgID = 1,
                LedgerHead = "Fees Updated",
                LedgerTypeID = 2,
                IsActive = true
            });

        await CreateService().SaveLedgerHeadAsync(new SaveLedgerHeadRequestDto
        {
            LedgerHeadID = 12,
            UnderOrgID = 1,
            LedgerHead = "Fees Updated",
            LedgerTypeID = 2
        });

        Assert.Equal(12, captured?.LedgerHeadID);
    }

    [Fact]
    public async Task SaveLedgerHeadAsync_TrimsAndPersistsDescription()
    {
        SaveLedgerHeadRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveLedgerHeadAsync(It.IsAny<SaveLedgerHeadRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveLedgerHeadRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(15);
        _repository
            .Setup(r => r.GetLedgerHeadByIdAsync(15, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new LedgerHeadMasterDto
            {
                LedgerHeadID = 15,
                UnderOrgID = 4,
                LedgerHead = "Fees",
                Description = "School fees",
                LedgerTypeID = 2,
                IsActive = true
            });

        await CreateService().SaveLedgerHeadAsync(new SaveLedgerHeadRequestDto
        {
            UnderOrgID = 4,
            LedgerHead = "  Fees  ",
            LedgerHeadEng = "  Fees Eng  ",
            Description = "  School fees  ",
            LedgerTypeID = 2
        });

        Assert.Equal("Fees", captured?.LedgerHead);
        Assert.Equal("Fees Eng", captured?.LedgerHeadEng);
        Assert.Equal("School fees", captured?.Description);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task ImportLedgerHeadsAsync_RejectsMissingDestinationOrg(long destination)
    {
        var (data, error) = await CreateService().ImportLedgerHeadsAsync(new ImportLedgerHeadRequestDto
        {
            DestinationUnderOrgID = destination,
            LedgerHeadIds = [1]
        });

        Assert.Null(data);
        Assert.Equal("Organization is required.", error);
    }

    [Fact]
    public async Task ImportLedgerHeadsAsync_RejectsDestinationOrgOne()
    {
        var (data, error) = await CreateService().ImportLedgerHeadsAsync(new ImportLedgerHeadRequestDto
        {
            DestinationUnderOrgID = 1,
            LedgerHeadIds = [1, 2]
        });

        Assert.Null(data);
        Assert.Equal("Cannot import into the source organization.", error);
        _repository.Verify(
            r => r.ImportLedgerHeadsAsync(It.IsAny<long>(), It.IsAny<IReadOnlyList<long>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ImportLedgerHeadsAsync_RejectsEmptyIds()
    {
        var (data, error) = await CreateService().ImportLedgerHeadsAsync(new ImportLedgerHeadRequestDto
        {
            DestinationUnderOrgID = 5,
            LedgerHeadIds = []
        });

        Assert.Null(data);
        Assert.Equal("Select at least one ledger head to import.", error);
    }

    [Fact]
    public async Task ImportLedgerHeadsAsync_CallsRepositoryAndReturnsCounts()
    {
        _repository
            .Setup(r => r.ImportLedgerHeadsAsync(6, It.IsAny<IReadOnlyList<long>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ImportLedgerHeadResultDto { ImportedCount = 2, SkippedCount = 1 });

        var (data, error) = await CreateService().ImportLedgerHeadsAsync(new ImportLedgerHeadRequestDto
        {
            DestinationUnderOrgID = 6,
            LedgerHeadIds = [10, 11, 12]
        });

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal(2, data!.ImportedCount);
        Assert.Equal(1, data.SkippedCount);
        _repository.Verify(
            r => r.ImportLedgerHeadsAsync(6, It.Is<IReadOnlyList<long>>(ids => ids.Count == 3), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task DeleteVoucherAsync_CallsRepositoryAndReturnsTrue()
    {
        _repository
            .Setup(r => r.DeleteVoucherAsync(33, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var ok = await CreateService().DeleteVoucherAsync(33);

        Assert.True(ok);
        _repository.Verify(r => r.DeleteVoucherAsync(33, It.IsAny<CancellationToken>()), Times.Once);
    }
}
