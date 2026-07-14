using SmartEPR.Core.DTOs.Teacher;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class TeacherServiceValidationTests
{
    private static SaveTeacherRequestDto ValidRequest() => new()
    {
        OrgID = 1,
        StaffTypeID = 2,
        DesignationCode = 1,
        GenderCode = 1,
        Firstname = "Ramesh",
        LastName = "Patil",
        MobileNo1 = "9876543210",
        EmailID = "ramesh@school.edu",
        AdharCardNo = "123456789012",
        PanNo = "ABCDE1234F"
    };

    [Fact]
    public void ValidateSave_RejectsMissingOrganization()
    {
        var request = ValidRequest();
        request.OrgID = null;
        Assert.Equal("Organization is required.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsMissingFirstName()
    {
        var request = ValidRequest();
        request.Firstname = "  ";
        Assert.Equal("First name is required.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsMissingLastName()
    {
        var request = ValidRequest();
        request.LastName = "";
        Assert.Equal("Last name is required.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsInvalidMobile()
    {
        var request = ValidRequest();
        request.MobileNo1 = "12345";
        Assert.Equal("Mobile no. 1 must be a 10-digit number.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsInvalidEmail()
    {
        var request = ValidRequest();
        request.EmailID = "not-an-email";
        Assert.Equal("Email ID format is invalid.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsInvalidAadhar()
    {
        var request = ValidRequest();
        request.AdharCardNo = "1234";
        Assert.Equal("Aadhar card no. must be 12 digits.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsInvalidPan()
    {
        var request = ValidRequest();
        request.PanNo = "INVALID";
        Assert.Equal("PAN no. format is invalid.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_AcceptsValidRequest()
    {
        Assert.Null(TeacherService.ValidateSave(ValidRequest()));
    }
}
