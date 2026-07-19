using Moq;
using SmartEPR.Core.DTOs.Audit;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

/// <summary>
/// Hardcore coverage for ACAccountRegisterMaster UnderOrgID + SrNo + Import (scripts 069 / 071).
/// </summary>
public sealed class AuditVoucherServiceAccountRegisterTests
{
    private readonly Mock<IAuditVoucherRepository> _repository = new();

    private AuditVoucherService CreateService() => new(_repository.Object);

    private static SaveAccountRegisterMasterRequestDto ValidSave(
        long underOrgId = 2,
        long srNo = 1,
        string name = "General Fund") => new()
    {
        UnderOrgID = underOrgId,
        SrNo = srNo,
        AccountRegister = name,
        IsActive = true
    };

    private static AccountRegisterMasterDto Saved(long id = 20, long underOrgId = 2, long srNo = 1, string name = "General Fund") => new()
    {
        AccountRegisterID = id,
        UnderOrgID = underOrgId,
        SrNo = srNo,
        AccountRegister = name,
        IsActive = true
    };

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task SaveAccountRegisterAsync_RejectsMissingOrganization(long underOrgId)
    {
        var (data, error) = await CreateService().SaveAccountRegisterAsync(ValidSave(underOrgId: underOrgId));

        Assert.Null(data);
        Assert.Equal("Organization is required.", error);
        _repository.Verify(r => r.SaveAccountRegisterAsync(It.IsAny<SaveAccountRegisterMasterRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public async Task SaveAccountRegisterAsync_RejectsMissingSrNo(long srNo)
    {
        var (data, error) = await CreateService().SaveAccountRegisterAsync(ValidSave(srNo: srNo));

        Assert.Null(data);
        Assert.Equal("Sr No is required.", error);
        _repository.Verify(r => r.SaveAccountRegisterAsync(It.IsAny<SaveAccountRegisterMasterRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task SaveAccountRegisterAsync_RejectsBlankName(string? name)
    {
        var (data, error) = await CreateService().SaveAccountRegisterAsync(ValidSave(name: name!));

        Assert.Null(data);
        Assert.Equal("Account register is required.", error);
    }

    [Fact]
    public async Task SaveAccountRegisterAsync_TrimsNameAndPersistsUnderOrgAndSrNo()
    {
        SaveAccountRegisterMasterRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveAccountRegisterAsync(It.IsAny<SaveAccountRegisterMasterRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveAccountRegisterMasterRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(20);
        _repository
            .Setup(r => r.GetAccountRegisterByIdAsync(20, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Saved(underOrgId: 9, srNo: 3, name: "Building Fund"));

        var (data, error) = await CreateService().SaveAccountRegisterAsync(ValidSave(underOrgId: 9, srNo: 3, name: "  Building Fund  "));

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal(9, captured?.UnderOrgID);
        Assert.Equal(3, captured?.SrNo);
        Assert.Equal("Building Fund", captured?.AccountRegister);
        Assert.Equal(20, data!.AccountRegisterID);
    }

    [Fact]
    public async Task SaveAccountRegisterAsync_ReturnsUnableToSave_WhenReloadMissing()
    {
        _repository
            .Setup(r => r.SaveAccountRegisterAsync(It.IsAny<SaveAccountRegisterMasterRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(55);
        _repository
            .Setup(r => r.GetAccountRegisterByIdAsync(55, It.IsAny<CancellationToken>()))
            .ReturnsAsync((AccountRegisterMasterDto?)null);

        var (data, error) = await CreateService().SaveAccountRegisterAsync(ValidSave());

        Assert.Null(data);
        Assert.Equal("Unable to save account register.", error);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task DeleteAccountRegisterAsync_RejectsInvalidId(long id)
    {
        var (success, error) = await CreateService().DeleteAccountRegisterAsync(id);

        Assert.False(success);
        Assert.Equal("Account register is required.", error);
        _repository.Verify(r => r.DeleteAccountRegisterAsync(It.IsAny<long>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAccountRegisterAsync_CallsRepositoryOnValidId()
    {
        _repository
            .Setup(r => r.DeleteAccountRegisterAsync(21, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var (success, error) = await CreateService().DeleteAccountRegisterAsync(21);

        Assert.True(success);
        Assert.Null(error);
        _repository.Verify(r => r.DeleteAccountRegisterAsync(21, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-4)]
    public async Task ImportAccountRegistersAsync_RejectsMissingDestinationOrg(long destination)
    {
        var (data, error) = await CreateService().ImportAccountRegistersAsync(new ImportAccountRegisterRequestDto
        {
            DestinationUnderOrgID = destination,
            AccountRegisterIds = [1]
        });

        Assert.Null(data);
        Assert.Equal("Organization is required.", error);
    }

    [Fact]
    public async Task ImportAccountRegistersAsync_RejectsDestinationOrgOne()
    {
        var (data, error) = await CreateService().ImportAccountRegistersAsync(new ImportAccountRegisterRequestDto
        {
            DestinationUnderOrgID = 1,
            AccountRegisterIds = [1, 2]
        });

        Assert.Null(data);
        Assert.Equal("Cannot import into the source organization.", error);
        _repository.Verify(
            r => r.ImportAccountRegistersAsync(It.IsAny<long>(), It.IsAny<IReadOnlyList<long>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ImportAccountRegistersAsync_RejectsEmptyIds()
    {
        var (data, error) = await CreateService().ImportAccountRegistersAsync(new ImportAccountRegisterRequestDto
        {
            DestinationUnderOrgID = 5,
            AccountRegisterIds = []
        });

        Assert.Null(data);
        Assert.Equal("Select at least one account register to import.", error);
    }

    [Fact]
    public async Task ImportAccountRegistersAsync_CallsRepositoryAndReturnsCounts()
    {
        _repository
            .Setup(r => r.ImportAccountRegistersAsync(6, It.IsAny<IReadOnlyList<long>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ImportAccountRegisterResultDto { ImportedCount = 3, SkippedCount = 2 });

        var (data, error) = await CreateService().ImportAccountRegistersAsync(new ImportAccountRegisterRequestDto
        {
            DestinationUnderOrgID = 6,
            AccountRegisterIds = [100, 101, 102, 103, 104]
        });

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal(3, data!.ImportedCount);
        Assert.Equal(2, data.SkippedCount);
        _repository.Verify(
            r => r.ImportAccountRegistersAsync(6, It.Is<IReadOnlyList<long>>(ids => ids.Count == 5), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task GetNextAccountRegisterSrNoAsync_PassesUnderOrgId()
    {
        _repository
            .Setup(r => r.GetNextAccountRegisterSrNoAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(4L);

        var next = await CreateService().GetNextAccountRegisterSrNoAsync(7);

        Assert.Equal(4, next);
    }

    [Fact]
    public async Task GetAccountRegisterDefineAsync_MapsIdsFromRepository()
    {
        _repository
            .Setup(r => r.GetAccountRegisterDefineByOrgAsync(3, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<AccountRegisterMasterOptionDto>
            {
                new() { AccountRegisterID = 1, AccountRegister = "A" },
                new() { AccountRegisterID = 9, AccountRegister = "B" }
            });

        var define = await CreateService().GetAccountRegisterDefineAsync(3);

        Assert.Equal(3, define.OrgID);
        Assert.Equal(new long[] { 1, 9 }, define.AccountRegisterIds);
    }

    [Fact]
    public async Task SaveAccountRegisterDefineAsync_PassesOrgAndIds()
    {
        IReadOnlyList<long>? captured = null;
        _repository
            .Setup(r => r.SaveAccountRegisterDefineAsync(3, It.IsAny<IReadOnlyList<long>>(), It.IsAny<CancellationToken>()))
            .Callback<long, IReadOnlyList<long>, CancellationToken>((_, ids, _) => captured = ids)
            .Returns(Task.CompletedTask);

        await CreateService().SaveAccountRegisterDefineAsync(new SaveAccountRegisterDefineRequestDto
        {
            OrgID = 3,
            AccountRegisterIds = [1, 2, 3]
        });

        Assert.Equal(new long[] { 1, 2, 3 }, captured);
    }

    [Fact]
    public async Task SaveAccountRegisterAsync_Update_PersistsExistingId()
    {
        SaveAccountRegisterMasterRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveAccountRegisterAsync(It.IsAny<SaveAccountRegisterMasterRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveAccountRegisterMasterRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(20);
        _repository
            .Setup(r => r.GetAccountRegisterByIdAsync(20, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Saved(id: 20, srNo: 2, name: "Updated Fund"));

        var (data, error) = await CreateService().SaveAccountRegisterAsync(new SaveAccountRegisterMasterRequestDto
        {
            AccountRegisterID = 20,
            UnderOrgID = 2,
            SrNo = 2,
            AccountRegister = "  Updated Fund  ",
            IsActive = true
        });

        Assert.Null(error);
        Assert.Equal(20, captured?.AccountRegisterID);
        Assert.Equal("Updated Fund", captured?.AccountRegister);
        Assert.Equal(20, data!.AccountRegisterID);
    }

    [Fact]
    public async Task SaveAccountRegisterAsync_Update_RejectsBlankName()
    {
        var (data, error) = await CreateService().SaveAccountRegisterAsync(new SaveAccountRegisterMasterRequestDto
        {
            AccountRegisterID = 20,
            UnderOrgID = 2,
            SrNo = 1,
            AccountRegister = "   "
        });

        Assert.Null(data);
        Assert.Equal("Account register is required.", error);
    }
}
