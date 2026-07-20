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
        AGID = 1,
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
    public void ValidateSave_RejectsMissingDesignation()
    {
        var request = ValidRequest();
        request.DesignationCode = null;
        Assert.Equal("Designation is required.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsMissingUserType()
    {
        var request = ValidRequest();
        request.StaffTypeID = null;
        Assert.Equal("User type is required.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsMissingGender()
    {
        var request = ValidRequest();
        request.GenderCode = null;
        Assert.Equal("Gender is required.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsMissingMobile()
    {
        var request = ValidRequest();
        request.MobileNo1 = "";
        Assert.Equal("Mobile no. 1 is required.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsInvalidMobile2()
    {
        var request = ValidRequest();
        request.MobileNo2 = "123";
        Assert.Equal("Mobile no. 2 must be a 10-digit number or 0.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_AcceptsValidMobile2()
    {
        var request = ValidRequest();
        request.MobileNo2 = "9123456789";
        Assert.Null(TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsNegativeRetirementYear()
    {
        var request = ValidRequest();
        request.RetirementYear = -1;
        Assert.Equal("Retirement year must be numeric.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_AcceptsEmployeeShortNameWithoutValidationError()
    {
        var request = ValidRequest();
        request.EmployeeShortName = "R.P.";
        Assert.Null(TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_AcceptsEmptyEmployeeShortName()
    {
        var request = ValidRequest();
        request.EmployeeShortName = null;
        Assert.Null(TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsMissingAgid()
    {
        var request = ValidRequest();
        request.AGID = null;
        Assert.Equal("Niyukticha Gut is required.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsInvalidMobile()
    {
        var request = ValidRequest();
        request.MobileNo1 = "12345";
        Assert.Equal("Mobile no. 1 must be a 10-digit number or 0.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_AcceptsMobileZeroPlaceholder()
    {
        var request = ValidRequest();
        request.MobileNo1 = "0";
        Assert.Null(TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_AcceptsDashTextNames()
    {
        var request = ValidRequest();
        request.Firstname = "-";
        request.LastName = "-";
        Assert.Null(TeacherService.ValidateSave(request));
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
        Assert.Equal("Aadhar card no. must be 12 digits, 0, or -.", TeacherService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_AcceptsAadharZeroOrDash()
    {
        var zero = ValidRequest();
        zero.AdharCardNo = "0";
        Assert.Null(TeacherService.ValidateSave(zero));

        var dash = ValidRequest();
        dash.AdharCardNo = "-";
        Assert.Null(TeacherService.ValidateSave(dash));
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
