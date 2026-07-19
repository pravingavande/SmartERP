using Moq;
using SmartEPR.Core.DTOs.Donation;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

/// <summary>
/// Hardcore coverage for DRHeadMaster UnderOrgID + SrNo + Import (scripts 070 / 072).
/// </summary>
public sealed class DonationServiceDRHeadTests
{
    private readonly Mock<IDonationRepository> _donationRepository = new();
    private readonly Mock<IAuditVoucherRepository> _auditRepository = new();

    private DonationService CreateService() => new(_donationRepository.Object, _auditRepository.Object);

    private static SaveDRHeadMasterRequestDto ValidSave(
        long underOrgId = 2,
        long srNo = 1,
        string name = "General Donation") => new()
    {
        UnderOrgID = underOrgId,
        SrNo = srNo,
        DRHeadName = name,
        IsActive = true
    };

    private static DRHeadMasterDto Saved(long id = 30, long underOrgId = 2, long srNo = 1, string name = "General Donation") => new()
    {
        DRHeadID = id,
        UnderOrgID = underOrgId,
        SrNo = srNo,
        DRHeadName = name,
        IsActive = true
    };

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task SaveDRHeadAsync_RejectsMissingOrganization(long underOrgId)
    {
        var (data, error) = await CreateService().SaveDRHeadAsync(ValidSave(underOrgId: underOrgId));

        Assert.Null(data);
        Assert.Equal("Organization is required.", error);
        _donationRepository.Verify(r => r.SaveDRHeadAsync(It.IsAny<SaveDRHeadMasterRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-2)]
    public async Task SaveDRHeadAsync_RejectsMissingSrNo(long srNo)
    {
        var (data, error) = await CreateService().SaveDRHeadAsync(ValidSave(srNo: srNo));

        Assert.Null(data);
        Assert.Equal("Sr No is required.", error);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task SaveDRHeadAsync_RejectsBlankName(string? name)
    {
        var (data, error) = await CreateService().SaveDRHeadAsync(ValidSave(name: name!));

        Assert.Null(data);
        Assert.Equal("Donation head is required.", error);
    }

    [Fact]
    public async Task SaveDRHeadAsync_TrimsNameAndPersistsUnderOrgAndSrNo()
    {
        SaveDRHeadMasterRequestDto? captured = null;
        _donationRepository
            .Setup(r => r.SaveDRHeadAsync(It.IsAny<SaveDRHeadMasterRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveDRHeadMasterRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(30);
        _donationRepository
            .Setup(r => r.GetDRHeadByIdAsync(30, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Saved(underOrgId: 4, srNo: 8, name: "Corpus"));

        var (data, error) = await CreateService().SaveDRHeadAsync(ValidSave(underOrgId: 4, srNo: 8, name: "  Corpus  "));

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal(4, captured?.UnderOrgID);
        Assert.Equal(8, captured?.SrNo);
        Assert.Equal("Corpus", captured?.DRHeadName);
        Assert.Equal(30, data!.DRHeadID);
        Assert.Equal("Corpus", data.DRHeadName);
    }

    [Fact]
    public async Task SaveDRHeadAsync_ReturnsUnableToSave_WhenReloadMissing()
    {
        _donationRepository
            .Setup(r => r.SaveDRHeadAsync(It.IsAny<SaveDRHeadMasterRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(77);
        _donationRepository
            .Setup(r => r.GetDRHeadByIdAsync(77, It.IsAny<CancellationToken>()))
            .ReturnsAsync((DRHeadMasterDto?)null);

        var (data, error) = await CreateService().SaveDRHeadAsync(ValidSave());

        Assert.Null(data);
        Assert.Equal("Unable to save donation head.", error);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-9)]
    public async Task DeleteDRHeadAsync_RejectsInvalidId(long id)
    {
        var (success, error) = await CreateService().DeleteDRHeadAsync(id);

        Assert.False(success);
        Assert.Equal("Donation head is required.", error);
        _donationRepository.Verify(r => r.DeleteDRHeadAsync(It.IsAny<long>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteDRHeadAsync_CallsRepositoryOnValidId()
    {
        _donationRepository
            .Setup(r => r.DeleteDRHeadAsync(31, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var (success, error) = await CreateService().DeleteDRHeadAsync(31);

        Assert.True(success);
        Assert.Null(error);
        _donationRepository.Verify(r => r.DeleteDRHeadAsync(31, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public async Task ImportDRHeadsAsync_RejectsMissingDestinationOrg(long destination)
    {
        var (data, error) = await CreateService().ImportDRHeadsAsync(new ImportDRHeadRequestDto
        {
            DestinationUnderOrgID = destination,
            DRHeadIds = [1]
        });

        Assert.Null(data);
        Assert.Equal("Organization is required.", error);
    }

    [Fact]
    public async Task ImportDRHeadsAsync_RejectsDestinationOrgOne()
    {
        var (data, error) = await CreateService().ImportDRHeadsAsync(new ImportDRHeadRequestDto
        {
            DestinationUnderOrgID = 1,
            DRHeadIds = [1]
        });

        Assert.Null(data);
        Assert.Equal("Cannot import into the source organization.", error);
        _donationRepository.Verify(
            r => r.ImportDRHeadsAsync(It.IsAny<long>(), It.IsAny<IReadOnlyList<long>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ImportDRHeadsAsync_RejectsEmptyIds()
    {
        var (data, error) = await CreateService().ImportDRHeadsAsync(new ImportDRHeadRequestDto
        {
            DestinationUnderOrgID = 8,
            DRHeadIds = []
        });

        Assert.Null(data);
        Assert.Equal("Select at least one donation head to import.", error);
    }

    [Fact]
    public async Task ImportDRHeadsAsync_CallsRepositoryAndReturnsCounts()
    {
        _donationRepository
            .Setup(r => r.ImportDRHeadsAsync(8, It.IsAny<IReadOnlyList<long>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ImportDRHeadResultDto { ImportedCount = 1, SkippedCount = 4 });

        var (data, error) = await CreateService().ImportDRHeadsAsync(new ImportDRHeadRequestDto
        {
            DestinationUnderOrgID = 8,
            DRHeadIds = [1, 2, 3, 4, 5]
        });

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal(1, data!.ImportedCount);
        Assert.Equal(4, data.SkippedCount);
    }

    [Fact]
    public async Task GetNextDRHeadSrNoAsync_PassesUnderOrgId()
    {
        _donationRepository
            .Setup(r => r.GetNextDRHeadSrNoAsync(2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(11L);

        var next = await CreateService().GetNextDRHeadSrNoAsync(2);

        Assert.Equal(11, next);
    }

    [Fact]
    public async Task GetDRHeadDefineAsync_MapsIdsFromRepository()
    {
        _donationRepository
            .Setup(r => r.GetDRHeadDefineByOrgAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DRHeadOptionDto>
            {
                new() { DRHeadID = 10, DRHeadName = "A" },
                new() { DRHeadID = 20, DRHeadName = "B" }
            });

        var define = await CreateService().GetDRHeadDefineAsync(5);

        Assert.Equal(5, define.OrgID);
        Assert.Equal(new long[] { 10, 20 }, define.DRHeadIds);
    }

    [Fact]
    public async Task SaveDRHeadDefineAsync_PassesOrgAndIds()
    {
        IReadOnlyList<long>? captured = null;
        _donationRepository
            .Setup(r => r.SaveDRHeadDefineAsync(5, It.IsAny<IReadOnlyList<long>>(), It.IsAny<CancellationToken>()))
            .Callback<long, IReadOnlyList<long>, CancellationToken>((_, ids, _) => captured = ids)
            .Returns(Task.CompletedTask);

        await CreateService().SaveDRHeadDefineAsync(new SaveDRHeadDefineRequestDto
        {
            OrgID = 5,
            DRHeadIds = [10, 20]
        });

        Assert.Equal(new long[] { 10, 20 }, captured);
    }

    [Fact]
    public async Task SaveDRHeadAsync_Update_PersistsExistingId()
    {
        SaveDRHeadMasterRequestDto? captured = null;
        _donationRepository
            .Setup(r => r.SaveDRHeadAsync(It.IsAny<SaveDRHeadMasterRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveDRHeadMasterRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(30);
        _donationRepository
            .Setup(r => r.GetDRHeadByIdAsync(30, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Saved(id: 30, srNo: 3, name: "Updated Head"));

        var (data, error) = await CreateService().SaveDRHeadAsync(new SaveDRHeadMasterRequestDto
        {
            DRHeadID = 30,
            UnderOrgID = 2,
            SrNo = 3,
            DRHeadName = "  Updated Head  ",
            IsActive = true
        });

        Assert.Null(error);
        Assert.Equal(30, captured?.DRHeadID);
        Assert.Equal("Updated Head", captured?.DRHeadName);
        Assert.Equal(30, data!.DRHeadID);
    }

    [Fact]
    public async Task SaveDRHeadAsync_Update_RejectsMissingSrNo()
    {
        var (data, error) = await CreateService().SaveDRHeadAsync(new SaveDRHeadMasterRequestDto
        {
            DRHeadID = 30,
            UnderOrgID = 2,
            SrNo = 0,
            DRHeadName = "Corpus"
        });

        Assert.Null(data);
        Assert.Equal("Sr No is required.", error);
    }
}
