using Moq;
using SmartEPR.Core.DTOs.Teacher;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class TeacherServiceBusinessTests
{
    private readonly Mock<ITeacherRepository> _teacherRepository = new();
    private readonly Mock<IAuditVoucherRepository> _auditRepository = new();

    private static SaveTeacherRequestDto ValidRequest() => new()
    {
        OrgID = 1,
        StaffTypeID = 2,
        DesignationCode = 1,
        GenderCode = 1,
        Firstname = "Ramesh",
        MiddleName = "Kumar",
        LastName = "Patil",
        EmployeeShortName = " R.P. ",
        MobileNo1 = "9876543210",
        SubjectName1 = "Mathematics"
    };

    private static TeacherDto SavedTeacher(long userId = 42) => new()
    {
        UserID = userId,
        OrgID = 1,
        StaffTypeID = 2,
        Firstname = "Ramesh",
        MiddleName = "Kumar",
        LastName = "Patil",
        EmployeeName = "Ramesh Kumar Patil",
        EmployeeShortName = "R.P.",
        MobileNo1 = "9876543210",
        IsActive = true
    };

    private TeacherService CreateService() => new(_teacherRepository.Object, _auditRepository.Object);

    [Fact]
    public async Task SaveAsync_RejectsValidationBeforeRepositoryCall()
    {
        var request = ValidRequest();
        request.OrgID = null;

        var (data, error) = await CreateService().SaveAsync(request);

        Assert.Null(data);
        Assert.Equal("Organization is required.", error);
        _teacherRepository.Verify(
            r => r.SaveAsync(It.IsAny<SaveTeacherRequestDto>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SaveAsync_RejectsDuplicateAppUserName()
    {
        var request = ValidRequest();
        request.AppUserName = "ramesh.teacher";
        request.AppPassword = "Secret@1";

        _teacherRepository
            .Setup(r => r.IsAppUserNameDuplicateAsync("ramesh.teacher", null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var (data, error) = await CreateService().SaveAsync(request);

        Assert.Null(data);
        Assert.Equal("App user name must be unique.", error);
        _teacherRepository.Verify(
            r => r.SaveAsync(It.IsAny<SaveTeacherRequestDto>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task SaveAsync_RequiresPasswordForNewAppLoginUser()
    {
        var request = ValidRequest();
        request.AppUserName = "ramesh.teacher";
        request.AppPassword = "";

        _teacherRepository
            .Setup(r => r.IsAppUserNameDuplicateAsync(It.IsAny<string>(), It.IsAny<long?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var (data, error) = await CreateService().SaveAsync(request);

        Assert.Null(data);
        Assert.Equal("Password is required for app login users.", error);
    }

    [Fact]
    public async Task SaveAsync_TrimsEmployeeShortNameAndTextFields()
    {
        SaveTeacherRequestDto? captured = null;
        var request = ValidRequest();
        request.Firstname = "  Ramesh  ";
        request.MiddleName = " Kumar ";
        request.LastName = " Patil ";
        request.EmployeeShortName = "  R.P.  ";
        request.PanNo = "abcde1234f";
        request.EmailID = "  ramesh@school.edu  ";

        _teacherRepository
            .Setup(r => r.IsAppUserNameDuplicateAsync(It.IsAny<string>(), It.IsAny<long?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _teacherRepository
            .Setup(r => r.SaveAsync(It.IsAny<SaveTeacherRequestDto>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .Callback<SaveTeacherRequestDto, bool, CancellationToken>((dto, _, _) => captured = dto)
            .ReturnsAsync(42);
        _teacherRepository
            .Setup(r => r.GetByIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SavedTeacher());

        var (data, error) = await CreateService().SaveAsync(request);

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.NotNull(captured);
        Assert.Equal("Ramesh", captured!.Firstname);
        Assert.Equal("Kumar", captured.MiddleName);
        Assert.Equal("Patil", captured.LastName);
        Assert.Equal("R.P.", captured.EmployeeShortName);
        Assert.Equal("ABCDE1234F", captured.PanNo);
        Assert.Equal("ramesh@school.edu", captured.EmailID);
        Assert.Equal(2, captured.StaffTypeID);
    }

    [Fact]
    public async Task SaveAsync_NewRecordUpdatesPasswordFlag()
    {
        _teacherRepository
            .Setup(r => r.SaveAsync(It.IsAny<SaveTeacherRequestDto>(), true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(42);
        _teacherRepository
            .Setup(r => r.GetByIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SavedTeacher());

        await CreateService().SaveAsync(ValidRequest());

        _teacherRepository.Verify(
            r => r.SaveAsync(It.IsAny<SaveTeacherRequestDto>(), true, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SaveAsync_EditWithoutPasswordDoesNotForcePasswordUpdate()
    {
        var request = ValidRequest();
        request.UserID = 42;
        request.AppPassword = null;

        _teacherRepository
            .Setup(r => r.IsAppUserNameDuplicateAsync(It.IsAny<string>(), 42L, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);
        _teacherRepository
            .Setup(r => r.SaveAsync(It.IsAny<SaveTeacherRequestDto>(), false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(42);
        _teacherRepository
            .Setup(r => r.GetByIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SavedTeacher());

        await CreateService().SaveAsync(request);

        _teacherRepository.Verify(
            r => r.SaveAsync(It.IsAny<SaveTeacherRequestDto>(), false, It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task SaveAsync_ReturnsSavedTeacherFromRepository()
    {
        _teacherRepository
            .Setup(r => r.SaveAsync(It.IsAny<SaveTeacherRequestDto>(), It.IsAny<bool>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(42);
        _teacherRepository
            .Setup(r => r.GetByIdAsync(42, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SavedTeacher());

        var (data, error) = await CreateService().SaveAsync(ValidRequest());

        Assert.Null(error);
        Assert.NotNull(data);
        Assert.Equal(42, data!.UserID);
        Assert.Equal("Ramesh Kumar Patil", data.EmployeeName);
        Assert.Equal("R.P.", data.EmployeeShortName);
    }

    [Fact]
    public async Task DeleteAsync_RejectsInvalidId()
    {
        var (success, error) = await CreateService().DeleteAsync(0);

        Assert.False(success);
        Assert.Equal("Invalid teacher id.", error);
        _teacherRepository.Verify(r => r.DeleteAsync(It.IsAny<long>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_DelegatesToRepository()
    {
        var (success, error) = await CreateService().DeleteAsync(15);

        Assert.True(success);
        Assert.Null(error);
        _teacherRepository.Verify(r => r.DeleteAsync(15, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task ResetPasswordAsync_RejectsBlankPassword()
    {
        var (success, error) = await CreateService().ResetPasswordAsync(10, "   ");

        Assert.False(success);
        Assert.Equal("Password is required.", error);
        _teacherRepository.Verify(
            r => r.ResetPasswordAsync(It.IsAny<long>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task ResetPasswordAsync_TrimsAndDelegates()
    {
        var (success, error) = await CreateService().ResetPasswordAsync(10, "  NewPass1  ");

        Assert.True(success);
        Assert.Null(error);
        _teacherRepository.Verify(r => r.ResetPasswordAsync(10, "NewPass1", It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetListAsync_DelegatesFilterToRepository()
    {
        var filter = new TeacherListFilterDto { OrgID = 3, Search = "Patil", IsActive = true };
        _teacherRepository
            .Setup(r => r.GetListAsync(filter, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<TeacherListItemDto> { new() { UserID = 1, Firstname = "Ramesh", LastName = "Patil" } });

        var list = await CreateService().GetListAsync(filter);

        Assert.Single(list);
        _teacherRepository.Verify(r => r.GetListAsync(filter, It.IsAny<CancellationToken>()), Times.Once);
    }
}
