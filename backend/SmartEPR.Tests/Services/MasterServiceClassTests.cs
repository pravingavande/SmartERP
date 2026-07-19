using Moq;
using SmartEPR.Core.DTOs.Master;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

/// <summary>
/// Hardcore coverage for ClassMaster OrgID + SrNo + Import (scripts 068 / 073).
/// </summary>
public sealed class MasterServiceClassTests
{
    private readonly Mock<IMasterRepository> _repository = new();

    private MasterService CreateService() => new(_repository.Object);

    private static SaveClassRequestDto ValidSave(long orgId = 2, long srNo = 1, string name = "Grade 1") => new()
    {
        OrgID = orgId,
        SrNo = srNo,
        ClassName = name,
        IsActive = true
    };

    private static ClassMasterDto SavedClass(long classId = 10, long orgId = 2, long srNo = 1, string name = "Grade 1") => new()
    {
        ClassID = classId,
        OrgID = orgId,
        SrNo = srNo,
        ClassName = name,
        IsActive = true
    };

    [Fact]
    public async Task SaveClassAsync_RejectsMissingOrg()
    {
        var (data, error) = await CreateService().SaveClassAsync(ValidSave(orgId: 0));

        Assert.Null(data);
        Assert.Equal("Organization is required.", error);
        _repository.Verify(r => r.SaveClassAsync(It.IsAny<SaveClassRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public async Task SaveClassAsync_RejectsMissingOrInvalidSrNo(long srNo)
    {
        var (data, error) = await CreateService().SaveClassAsync(ValidSave(srNo: srNo));

        Assert.Null(data);
        Assert.Equal("Sr No is required.", error);
        _repository.Verify(r => r.SaveClassAsync(It.IsAny<SaveClassRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task SaveClassAsync_RejectsBlankClassName(string name)
    {
        var (data, error) = await CreateService().SaveClassAsync(ValidSave(name: name));

        Assert.Null(data);
        Assert.Equal("Class name is required.", error);
        _repository.Verify(r => r.SaveClassAsync(It.IsAny<SaveClassRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SaveClassAsync_TrimsClassNameAndPersistsOrgAndSrNo()
    {
        SaveClassRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveClassAsync(It.IsAny<SaveClassRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveClassRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(10);
        _repository
            .Setup(r => r.GetClassByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SavedClass(orgId: 5, srNo: 7, name: "Nursery"));

        var (data, error) = await CreateService().SaveClassAsync(ValidSave(orgId: 5, srNo: 7, name: "  Nursery  "));

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal(5, captured?.OrgID);
        Assert.Equal(7, captured?.SrNo);
        Assert.Equal("Nursery", captured?.ClassName);
        Assert.Equal(10, data!.ClassID);
        Assert.Equal(5, data.OrgID);
        Assert.Equal(7, data.SrNo);
    }

    [Fact]
    public async Task SaveClassAsync_ReturnsUnableToSave_WhenReloadMissing()
    {
        _repository
            .Setup(r => r.SaveClassAsync(It.IsAny<SaveClassRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(99);
        _repository
            .Setup(r => r.GetClassByIdAsync(99, It.IsAny<CancellationToken>()))
            .ReturnsAsync((ClassMasterDto?)null);

        var (data, error) = await CreateService().SaveClassAsync(ValidSave());

        Assert.Null(data);
        Assert.Equal("Unable to save class.", error);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task DeleteClassAsync_RejectsInvalidId(long classId)
    {
        var (success, error) = await CreateService().DeleteClassAsync(classId);

        Assert.False(success);
        Assert.Equal("Class is required.", error);
        _repository.Verify(r => r.DeleteClassAsync(It.IsAny<long>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteClassAsync_CallsRepositoryOnValidId()
    {
        _repository
            .Setup(r => r.DeleteClassAsync(15, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var (success, error) = await CreateService().DeleteClassAsync(15);

        Assert.True(success);
        Assert.Null(error);
        _repository.Verify(r => r.DeleteClassAsync(15, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-2)]
    public async Task ImportClassesAsync_RejectsMissingDestinationOrg(long destinationOrgId)
    {
        var (data, error) = await CreateService().ImportClassesAsync(new ImportClassRequestDto
        {
            DestinationOrgID = destinationOrgId,
            ClassIds = [1, 2]
        });

        Assert.Null(data);
        Assert.Equal("Organization is required.", error);
        _repository.Verify(
            r => r.ImportClassesAsync(It.IsAny<long>(), It.IsAny<IReadOnlyList<long>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ImportClassesAsync_RejectsDestinationOrgOne_SourceOrganization()
    {
        var (data, error) = await CreateService().ImportClassesAsync(new ImportClassRequestDto
        {
            DestinationOrgID = 1,
            ClassIds = [1]
        });

        Assert.Null(data);
        Assert.Equal("Cannot import into the source organization.", error);
        _repository.Verify(
            r => r.ImportClassesAsync(It.IsAny<long>(), It.IsAny<IReadOnlyList<long>>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ImportClassesAsync_RejectsEmptyClassIds()
    {
        var (data, error) = await CreateService().ImportClassesAsync(new ImportClassRequestDto
        {
            DestinationOrgID = 3,
            ClassIds = []
        });

        Assert.Null(data);
        Assert.Equal("Select at least one class to import.", error);
    }

    [Fact]
    public async Task ImportClassesAsync_CallsRepositoryAndReturnsCounts()
    {
        IReadOnlyList<long>? capturedIds = null;
        _repository
            .Setup(r => r.ImportClassesAsync(4, It.IsAny<IReadOnlyList<long>>(), It.IsAny<CancellationToken>()))
            .Callback<long, IReadOnlyList<long>, CancellationToken>((_, ids, _) => capturedIds = ids)
            .ReturnsAsync(new ImportClassResultDto { ImportedCount = 2, SkippedCount = 1 });

        var (data, error) = await CreateService().ImportClassesAsync(new ImportClassRequestDto
        {
            DestinationOrgID = 4,
            ClassIds = [10, 11, 12]
        });

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal(2, data!.ImportedCount);
        Assert.Equal(1, data.SkippedCount);
        Assert.Equal(new long[] { 10, 11, 12 }, capturedIds);
    }

    [Fact]
    public async Task GetClassNextSrNoAsync_PassesOrgIdToRepository()
    {
        _repository
            .Setup(r => r.GetClassNextSrNoAsync(8, It.IsAny<CancellationToken>()))
            .ReturnsAsync(6L);

        var next = await CreateService().GetClassNextSrNoAsync(8);

        Assert.Equal(6, next);
        _repository.Verify(r => r.GetClassNextSrNoAsync(8, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetClassListAsync_PassesOrgAndSearch()
    {
        _repository
            .Setup(r => r.GetClassListAsync(2, "nur", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<ClassMasterDto> { SavedClass(name: "Nursery") });

        var list = await CreateService().GetClassListAsync(2, "nur");

        Assert.Single(list);
        Assert.Equal("Nursery", list[0].ClassName);
    }

    [Fact]
    public async Task SaveClassAsync_Update_PersistsExistingClassIdWithValidation()
    {
        SaveClassRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveClassAsync(It.IsAny<SaveClassRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveClassRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(15);
        _repository
            .Setup(r => r.GetClassByIdAsync(15, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SavedClass(classId: 15, orgId: 2, srNo: 4, name: "Grade 2"));

        var request = ValidSave(srNo: 4, name: "  Grade 2  ");
        request.ClassID = 15;

        var (data, error) = await CreateService().SaveClassAsync(request);

        Assert.Null(error);
        Assert.Equal(15, captured?.ClassID);
        Assert.Equal(4, captured?.SrNo);
        Assert.Equal("Grade 2", captured?.ClassName);
        Assert.Equal(15, data!.ClassID);
    }

    [Fact]
    public async Task SaveClassAsync_Update_StillRejectsInvalidSrNo()
    {
        var request = ValidSave(srNo: 0, name: "Grade 2");
        request.ClassID = 15;

        var (data, error) = await CreateService().SaveClassAsync(request);

        Assert.Null(data);
        Assert.Equal("Sr No is required.", error);
        _repository.Verify(r => r.SaveClassAsync(It.IsAny<SaveClassRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }
}
