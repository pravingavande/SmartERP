using Moq;
using SmartEPR.Core.DTOs.Employee;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class EmployeeServiceSaveTests
{
    private readonly Mock<IEmployeeRepository> _employeeRepository = new();
    private readonly Mock<IAuditVoucherRepository> _auditRepository = new();

    private EmployeeService CreateService() => new(_employeeRepository.Object, _auditRepository.Object);

    [Fact]
    public async Task SaveAsync_RejectsMissingFirstName()
    {
        var request = new SaveEmployeeRequestDto
        {
            Firstname = "  ",
            MobileNo1 = "9876543210",
            EmployeeShortName = "R.P."
        };

        var result = await CreateService().SaveAsync(request);

        Assert.Null(result);
        _employeeRepository.Verify(r => r.SaveAsync(It.IsAny<SaveEmployeeRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SaveAsync_RejectsMissingMobile()
    {
        var request = new SaveEmployeeRequestDto
        {
            Firstname = "Ramesh",
            MobileNo1 = "",
            EmployeeShortName = "R.P."
        };

        var result = await CreateService().SaveAsync(request);

        Assert.Null(result);
        _employeeRepository.Verify(r => r.SaveAsync(It.IsAny<SaveEmployeeRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SaveAsync_PassesEmployeeShortNameToRepository()
    {
        SaveEmployeeRequestDto? captured = null;
        var request = new SaveEmployeeRequestDto
        {
            Firstname = "Ramesh",
            MiddleName = "Kumar",
            LastName = "Patil",
            MobileNo1 = "9876543210",
            EmployeeShortName = "R.P."
        };

        _employeeRepository
            .Setup(r => r.SaveAsync(It.IsAny<SaveEmployeeRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveEmployeeRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(99);
        _employeeRepository
            .Setup(r => r.GetByIdAsync(99, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmployeeDto
            {
                UserID = 99,
                Firstname = "Ramesh",
                MiddleName = "Kumar",
                LastName = "Patil",
                EmployeeName = "Ramesh Kumar Patil",
                EmployeeShortName = "R.P.",
                MobileNo1 = "9876543210"
            });

        var result = await CreateService().SaveAsync(request);

        Assert.NotNull(result);
        Assert.NotNull(captured);
        Assert.Equal("R.P.", captured!.EmployeeShortName);
        Assert.Equal("Ramesh Kumar Patil", result!.EmployeeName);
    }

    [Fact]
    public async Task SaveAsync_ReturnsEmployeeWithEmployeeNameFromDatabase()
    {
        var request = new SaveEmployeeRequestDto
        {
            Firstname = "Suresh",
            LastName = "Deshmukh",
            MobileNo1 = "9123456780"
        };

        _employeeRepository
            .Setup(r => r.SaveAsync(It.IsAny<SaveEmployeeRequestDto>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(7);
        _employeeRepository
            .Setup(r => r.GetByIdAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EmployeeDto
            {
                UserID = 7,
                Firstname = "Suresh",
                LastName = "Deshmukh",
                EmployeeName = "Suresh Deshmukh",
                MobileNo1 = "9123456780"
            });

        var result = await CreateService().SaveAsync(request);

        Assert.NotNull(result);
        Assert.Equal("Suresh Deshmukh", result!.EmployeeName);
    }

    [Fact]
    public async Task GetListAsync_DelegatesToRepository()
    {
        _employeeRepository
            .Setup(r => r.GetListAsync(1, "Patil", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<EmployeeListItemDto>
            {
                new()
                {
                    UserID = 1,
                    Firstname = "Ramesh",
                    LastName = "Patil",
                    EmployeeName = "Ramesh Patil",
                    EmployeeShortName = "R.P."
                }
            });

        var list = await CreateService().GetListAsync(1, 1, "Patil");

        Assert.Single(list);
        Assert.Equal("Ramesh Patil", list[0].EmployeeName);
        Assert.Equal("R.P.", list[0].EmployeeShortName);
    }
}
