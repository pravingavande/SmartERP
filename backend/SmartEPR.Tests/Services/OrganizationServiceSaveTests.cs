using Moq;
using SmartEPR.Core.DTOs.Organization;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class OrganizationServiceSaveTests
{
    private readonly Mock<IOrganizationRepository> _repository = new();
    private readonly Mock<IAuditVoucherRepository> _auditRepository = new();

    private OrganizationService CreateService() => new(_repository.Object, _auditRepository.Object);

    private static SaveOrganizationRequestDto ValidSchool(
        string organizationName = "School A",
        long? orgId = null,
        string? panNo = null,
        string? emailId = null) => new()
    {
        OrgID = orgId,
        BusinessCategoryID = 2,
        UnderOrgID = 3,
        SchoolCategoryID = 1,
        OrganizationName = organizationName,
        MobileNo = "9876543210",
        PanNo = panNo,
        EmailID = emailId
    };

    [Fact]
    public async Task SaveAsync_RejectsValidationBeforeRepository()
    {
        var (data, error) = await CreateService().SaveAsync(ValidSchool(organizationName: ""));

        Assert.Null(data);
        Assert.Equal("Organization Name is required.", error);
        _repository.Verify(
            r => r.SaveAsync(It.IsAny<SaveOrganizationRequestDto>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SaveAsync_TrimsNameAndUppercasesPan()
    {
        SaveOrganizationRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveAsync(It.IsAny<SaveOrganizationRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveOrganizationRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(10L);
        _repository
            .Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OrganizationDto { OrgID = 10, OrganizationName = "School A" });

        var (data, error) = await CreateService().SaveAsync(
            ValidSchool(organizationName: "  School A  ", panNo: "abcde1234f", emailId: "  a@b.com  "));

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal("School A", captured?.OrganizationName);
        Assert.Equal("ABCDE1234F", captured?.PanNo);
        Assert.Equal("a@b.com", captured?.EmailID);
    }

    [Fact]
    public async Task SaveAsync_Sanstha_SetsUnderOrgIdToOrgId()
    {
        SaveOrganizationRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveAsync(It.IsAny<SaveOrganizationRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveOrganizationRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(5L);
        _repository
            .Setup(r => r.GetByIdAsync(5, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OrganizationDto { OrgID = 5, OrganizationName = "Sanstha" });

        await CreateService().SaveAsync(new SaveOrganizationRequestDto
        {
            OrgID = 5,
            BusinessCategoryID = 3,
            UnderOrgID = 99,
            SchoolCategoryID = 1,
            OrganizationName = "Sanstha"
        });

        Assert.Equal(5, captured?.UnderOrgID);
    }

    [Fact]
    public async Task SaveAsync_ReturnsUnableToSave_WhenRepoReturnsNullId()
    {
        _repository
            .Setup(r => r.SaveAsync(It.IsAny<SaveOrganizationRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((long?)null);

        var (data, error) = await CreateService().SaveAsync(ValidSchool());

        Assert.Null(data);
        Assert.Equal("Unable to save organization.", error);
    }

    [Fact]
    public async Task SaveAsync_ReturnsReloadError_WhenGetByIdMissing()
    {
        _repository
            .Setup(r => r.SaveAsync(It.IsAny<SaveOrganizationRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(10L);
        _repository
            .Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync((OrganizationDto?)null);

        var (data, error) = await CreateService().SaveAsync(ValidSchool());

        Assert.Null(data);
        Assert.Equal("Organization saved but could not be reloaded.", error);
    }

    [Fact]
    public async Task SaveAsync_Update_PassesExistingOrgId()
    {
        SaveOrganizationRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveAsync(It.IsAny<SaveOrganizationRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveOrganizationRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(10L);
        _repository
            .Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new OrganizationDto { OrgID = 10, OrganizationName = "School A" });

        await CreateService().SaveAsync(ValidSchool(orgId: 10));

        Assert.Equal(10, captured?.OrgID);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task DeleteAsync_RejectsInvalidId(long orgId)
    {
        var (success, error) = await CreateService().DeleteAsync(orgId);

        Assert.False(success);
        Assert.Equal("Organization not found.", error);
        _repository.Verify(r => r.DeleteAsync(It.IsAny<long>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_CallsRepository()
    {
        _repository.Setup(r => r.DeleteAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var (success, error) = await CreateService().DeleteAsync(10);

        Assert.True(success);
        Assert.Null(error);
    }
}
