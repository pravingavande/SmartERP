using SmartEPR.Core.DTOs.Organization;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class OrganizationServiceValidationTests
{
    [Fact]
    public void ValidateSave_RejectsMissingBusinessCategory()
    {
        var request = new SaveOrganizationRequestDto { OrganizationName = "Test", SchoolCategoryID = 1 };
        Assert.Equal("Business Category is required.", OrganizationService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsMissingOrganizationName()
    {
        var request = new SaveOrganizationRequestDto { BusinessCategoryID = 2, SchoolCategoryID = 1 };
        Assert.Equal("Organization Name is required.", OrganizationService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsSchoolWithoutSanstha()
    {
        var request = new SaveOrganizationRequestDto
        {
            BusinessCategoryID = 2,
            SchoolCategoryID = 1,
            OrganizationName = "School A"
        };
        Assert.Equal("Under Sanstha is required.", OrganizationService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsInvalidMobile()
    {
        var request = new SaveOrganizationRequestDto
        {
            BusinessCategoryID = 2,
            UnderOrgID = 3,
            SchoolCategoryID = 1,
            OrganizationName = "School A",
            MobileNo = "12345"
        };
        Assert.Equal("Mobile number must be 10 digits.", OrganizationService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_AcceptsValidSchool()
    {
        var request = new SaveOrganizationRequestDto
        {
            BusinessCategoryID = 2,
            UnderOrgID = 3,
            SchoolCategoryID = 1,
            OrganizationName = "School A",
            MobileNo = "9876543210"
        };
        Assert.Null(OrganizationService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsMissingSchoolCategory()
    {
        var request = new SaveOrganizationRequestDto
        {
            BusinessCategoryID = 2,
            UnderOrgID = 3,
            OrganizationName = "School A"
        };
        Assert.Equal("School Category is required.", OrganizationService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsInvalidEmail()
    {
        var request = new SaveOrganizationRequestDto
        {
            BusinessCategoryID = 2,
            UnderOrgID = 3,
            SchoolCategoryID = 1,
            OrganizationName = "School A",
            EmailID = "bad-email"
        };
        Assert.Equal("Enter a valid email address.", OrganizationService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsInvalidPhone()
    {
        var request = new SaveOrganizationRequestDto
        {
            BusinessCategoryID = 2,
            UnderOrgID = 3,
            SchoolCategoryID = 1,
            OrganizationName = "School A",
            PhoneNo = "12AB"
        };
        Assert.Equal("Phone number must be numeric.", OrganizationService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsInvalidPan()
    {
        var request = new SaveOrganizationRequestDto
        {
            BusinessCategoryID = 2,
            UnderOrgID = 3,
            SchoolCategoryID = 1,
            OrganizationName = "School A",
            PanNo = "INVALID"
        };
        Assert.Equal("Enter a valid PAN number.", OrganizationService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsInvalidEstablishmentYear()
    {
        var request = new SaveOrganizationRequestDto
        {
            BusinessCategoryID = 2,
            UnderOrgID = 3,
            SchoolCategoryID = 1,
            OrganizationName = "School A",
            EstablishmentYear = "96"
        };
        Assert.Equal("Establishment year must be 4 digits.", OrganizationService.ValidateSave(request));
    }

    [Fact]
    public void ValidateSave_RejectsInvalidWebsite()
    {
        var request = new SaveOrganizationRequestDto
        {
            BusinessCategoryID = 2,
            UnderOrgID = 3,
            SchoolCategoryID = 1,
            OrganizationName = "School A",
            WebSite = "not-a-url"
        };
        Assert.Equal("Enter a valid website URL.", OrganizationService.ValidateSave(request));
    }
}
