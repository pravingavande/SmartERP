using Moq;
using SmartEPR.Core.DTOs.IoRegister;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class IoRegisterServiceValidationTests
{
    private readonly Mock<IIoRegisterRepository> _repository = new();

    private static SaveInwardRequestDto ValidInwardRequest() => new()
    {
        OrgID = 1,
        IRDate = new DateTime(2026, 3, 15),
        FromWhomReceived = "Education Department",
        Subject = "Annual inspection letter",
        FileNo = "F-101",
        LetterNo = "L-55",
        ToWhomIssued = "Principal",
        Remark = "Urgent"
    };

    private static SaveOutwardRequestDto ValidOutwardRequest() => new()
    {
        OrgID = 1,
        ORDate = new DateTime(2026, 3, 16),
        Address = "Block Education Officer, Pune",
        Subject = "Reply to inspection notice",
        FileNo = "OF-22",
        Enclosures = "Copy of report",
        ExpensesAmt = 45.50m,
        Remark = "Registered post"
    };

    private static InwardRegisterDto SampleInward(long id = 10, int recordNo = 3) => new()
    {
        IRID = id,
        OrgID = 1,
        RecordNo = recordNo,
        IRDate = new DateTime(2026, 3, 15),
        FromWhomReceived = "Education Department",
        Subject = "Annual inspection letter",
        YIOID = 1,
        YearName = "2026"
    };

    private static OutwardRegisterDto SampleOutward(long id = 20, int recordNo = 2) => new()
    {
        ORID = id,
        OrgID = 1,
        RecordNo = recordNo,
        ORDate = new DateTime(2026, 3, 16),
        Address = "Block Education Officer, Pune",
        Subject = "Reply to inspection notice",
        ExpensesAmt = 45.50m,
        YIOID = 1,
        YearName = "2026"
    };

    private IoRegisterService CreateService() => new(_repository.Object);

    [Fact]
    public async Task SaveInwardAsync_RejectsMissingOrganization()
    {
        var request = ValidInwardRequest();
        request.OrgID = 0;

        var (data, error) = await CreateService().SaveInwardAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Organization is required.", error);
        _repository.Verify(r => r.SaveInwardAsync(It.IsAny<SaveInwardRequestDto>(), It.IsAny<long?>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SaveInwardAsync_RejectsDefaultInwardDate()
    {
        var request = ValidInwardRequest();
        request.IRDate = default;

        var (data, error) = await CreateService().SaveInwardAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Inward date is required.", error);
    }

    [Fact]
    public async Task SaveInwardAsync_RejectsBlankFromWhomReceived()
    {
        var request = ValidInwardRequest();
        request.FromWhomReceived = "   ";

        var (data, error) = await CreateService().SaveInwardAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("From whom received is required.", error);
    }

    [Fact]
    public async Task SaveInwardAsync_RejectsBlankSubject()
    {
        var request = ValidInwardRequest();
        request.Subject = "";

        var (data, error) = await CreateService().SaveInwardAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Subject is required.", error);
    }

    [Fact]
    public async Task SaveInwardAsync_TrimsTextFieldsBeforeSave()
    {
        SaveInwardRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveInwardAsync(It.IsAny<SaveInwardRequestDto>(), It.IsAny<long?>(), It.IsAny<CancellationToken>()))
            .Callback<SaveInwardRequestDto, long?, CancellationToken>((dto, _, _) => captured = dto)
            .ReturnsAsync(10);
        _repository
            .Setup(r => r.GetInwardByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleInward());

        var request = ValidInwardRequest();
        request.FromWhomReceived = "  Education Department  ";
        request.Subject = "  Annual inspection letter  ";
        request.FileNo = "  F-101  ";
        request.LetterNo = "  L-55  ";
        request.ToWhomIssued = "  Principal  ";
        request.Remark = "  Urgent  ";

        var (data, error) = await CreateService().SaveInwardAsync(request, 99);

        Assert.NotNull(data);
        Assert.Null(error);
        Assert.Equal("Education Department", captured?.FromWhomReceived);
        Assert.Equal("Annual inspection letter", captured?.Subject);
        Assert.Equal("F-101", captured?.FileNo);
        Assert.Equal("L-55", captured?.LetterNo);
        Assert.Equal("Principal", captured?.ToWhomIssued);
        Assert.Equal("Urgent", captured?.Remark);
    }

    [Fact]
    public async Task SaveInwardAsync_ReturnsSavedRecordOnSuccess()
    {
        _repository
            .Setup(r => r.SaveInwardAsync(It.IsAny<SaveInwardRequestDto>(), It.IsAny<long?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(10);
        _repository
            .Setup(r => r.GetInwardByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleInward());

        var (data, error) = await CreateService().SaveInwardAsync(ValidInwardRequest(), 5);

        Assert.NotNull(data);
        Assert.Null(error);
        Assert.Equal(10, data.IRID);
        Assert.Equal(3, data.RecordNo);
    }

    [Fact]
    public async Task SaveInwardAsync_ReturnsErrorWhenReloadFails()
    {
        _repository
            .Setup(r => r.SaveInwardAsync(It.IsAny<SaveInwardRequestDto>(), It.IsAny<long?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(10);
        _repository
            .Setup(r => r.GetInwardByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync((InwardRegisterDto?)null);

        var (data, error) = await CreateService().SaveInwardAsync(ValidInwardRequest(), 5);

        Assert.Null(data);
        Assert.Equal("Unable to save inward entry.", error);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task DeleteInwardAsync_RejectsInvalidId(long irid)
    {
        var (success, error) = await CreateService().DeleteInwardAsync(irid);

        Assert.False(success);
        Assert.Equal("Inward entry is required.", error);
        _repository.Verify(r => r.DeleteInwardAsync(It.IsAny<long>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteInwardAsync_SucceedsForValidId()
    {
        _repository
            .Setup(r => r.DeleteInwardAsync(10, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var (success, error) = await CreateService().DeleteInwardAsync(10);

        Assert.True(success);
        Assert.Null(error);
    }

    [Fact]
    public async Task SaveOutwardAsync_RejectsMissingOrganization()
    {
        var request = ValidOutwardRequest();
        request.OrgID = 0;

        var (data, error) = await CreateService().SaveOutwardAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Organization is required.", error);
    }

    [Fact]
    public async Task SaveOutwardAsync_RejectsDefaultOutwardDate()
    {
        var request = ValidOutwardRequest();
        request.ORDate = default;

        var (data, error) = await CreateService().SaveOutwardAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Outward date is required.", error);
    }

    [Fact]
    public async Task SaveOutwardAsync_RejectsBlankAddress()
    {
        var request = ValidOutwardRequest();
        request.Address = "  ";

        var (data, error) = await CreateService().SaveOutwardAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Address is required.", error);
    }

    [Fact]
    public async Task SaveOutwardAsync_RejectsBlankSubject()
    {
        var request = ValidOutwardRequest();
        request.Subject = "";

        var (data, error) = await CreateService().SaveOutwardAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Subject is required.", error);
    }

    [Theory]
    [InlineData(-1)]
    [InlineData(-0.01)]
    public async Task SaveOutwardAsync_RejectsNegativeExpenses(decimal expenses)
    {
        var request = ValidOutwardRequest();
        request.ExpensesAmt = expenses;

        var (data, error) = await CreateService().SaveOutwardAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Expenses amount must be greater than or equal to zero.", error);
    }

    [Fact]
    public async Task SaveOutwardAsync_AllowsZeroExpenses()
    {
        SaveOutwardRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveOutwardAsync(It.IsAny<SaveOutwardRequestDto>(), It.IsAny<long?>(), It.IsAny<CancellationToken>()))
            .Callback<SaveOutwardRequestDto, long?, CancellationToken>((dto, _, _) => captured = dto)
            .ReturnsAsync(20);
        _repository
            .Setup(r => r.GetOutwardByIdAsync(20, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleOutward());

        var request = ValidOutwardRequest();
        request.ExpensesAmt = 0;

        var (data, error) = await CreateService().SaveOutwardAsync(request, 1);

        Assert.NotNull(data);
        Assert.Null(error);
        Assert.Equal(0, captured?.ExpensesAmt);
    }

    [Fact]
    public async Task SaveOutwardAsync_TrimsTextFieldsBeforeSave()
    {
        SaveOutwardRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveOutwardAsync(It.IsAny<SaveOutwardRequestDto>(), It.IsAny<long?>(), It.IsAny<CancellationToken>()))
            .Callback<SaveOutwardRequestDto, long?, CancellationToken>((dto, _, _) => captured = dto)
            .ReturnsAsync(20);
        _repository
            .Setup(r => r.GetOutwardByIdAsync(20, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleOutward());

        var request = ValidOutwardRequest();
        request.Address = "  Block Education Officer, Pune  ";
        request.Subject = "  Reply to inspection notice  ";
        request.FileNo = "  OF-22  ";
        request.Enclosures = "  Copy of report  ";
        request.Remark = "  Registered post  ";

        var (data, error) = await CreateService().SaveOutwardAsync(request, 1);

        Assert.NotNull(data);
        Assert.Null(error);
        Assert.Equal("Block Education Officer, Pune", captured?.Address);
        Assert.Equal("Reply to inspection notice", captured?.Subject);
        Assert.Equal("OF-22", captured?.FileNo);
        Assert.Equal("Copy of report", captured?.Enclosures);
        Assert.Equal("Registered post", captured?.Remark);
    }

    [Fact]
    public async Task SaveOutwardAsync_ReturnsSavedRecordOnSuccess()
    {
        _repository
            .Setup(r => r.SaveOutwardAsync(It.IsAny<SaveOutwardRequestDto>(), It.IsAny<long?>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(20);
        _repository
            .Setup(r => r.GetOutwardByIdAsync(20, It.IsAny<CancellationToken>()))
            .ReturnsAsync(SampleOutward());

        var (data, error) = await CreateService().SaveOutwardAsync(ValidOutwardRequest(), 1);

        Assert.NotNull(data);
        Assert.Null(error);
        Assert.Equal(20, data.ORID);
        Assert.Equal(2, data.RecordNo);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-5)]
    public async Task DeleteOutwardAsync_RejectsInvalidId(long orid)
    {
        var (success, error) = await CreateService().DeleteOutwardAsync(orid);

        Assert.False(success);
        Assert.Equal("Outward entry is required.", error);
    }

    [Fact]
    public async Task DeleteOutwardAsync_SucceedsForValidId()
    {
        _repository
            .Setup(r => r.DeleteOutwardAsync(20, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var (success, error) = await CreateService().DeleteOutwardAsync(20);

        Assert.True(success);
        Assert.Null(error);
    }

    [Fact]
    public void BuildInwardReportCsv_IncludesHeaderAndRow()
    {
        var rows = new List<InwardRegisterDto>
        {
            new()
            {
                RecordNo = 1,
                IRDate = new DateTime(2026, 1, 10),
                FileNo = "F1",
                LetterNo = "L1",
                FromWhomReceived = "Sender",
                Subject = "Test subject",
                ToWhomIssued = "Office",
                Remark = "Note",
                YearName = "2026"
            }
        };

        var csv = CreateService().BuildInwardReportCsv(rows);

        Assert.Contains("Record No,Date,File No,Letter No,From Whom Received,Subject,To Whom Issued,Remarks,Year", csv);
        Assert.Contains("1,10/01/2026,F1,L1,Sender,Test subject,Office,Note,2026", csv);
    }

    [Fact]
    public void BuildInwardReportCsv_EscapesCommaAndQuotesInSubject()
    {
        var rows = new List<InwardRegisterDto>
        {
            new()
            {
                RecordNo = 2,
                IRDate = new DateTime(2026, 2, 5),
                FromWhomReceived = "Dept",
                Subject = "Hello, \"urgent\" memo",
                YearName = "2026"
            }
        };

        var csv = CreateService().BuildInwardReportCsv(rows);

        Assert.Contains("\"Hello, \"\"urgent\"\" memo\"", csv);
    }

    [Fact]
    public void BuildOutwardReportCsv_IncludesHeaderAndFormattedAmount()
    {
        var rows = new List<OutwardRegisterDto>
        {
            new()
            {
                RecordNo = 5,
                ORDate = new DateTime(2026, 4, 1),
                FileNo = "OF-9",
                Subject = "Dispatch",
                Address = "Pune",
                Enclosures = "2 pages",
                ExpensesAmt = 12.5m,
                Remark = "OK",
                YearName = "2026"
            }
        };

        var outwardCsv = CreateService().BuildOutwardReportCsv(rows);

        Assert.Contains("Record No,Date,File No,Subject,Address,Enclosures,Expenses Amount,Remarks,Year", outwardCsv);
        Assert.Contains("5,01/04/2026,OF-9,Dispatch,Pune,2 pages,12.50,OK,2026", outwardCsv);
    }

    [Fact]
    public async Task GetInwardListAsync_DelegatesToRepository()
    {
        var filter = new InwardListFilterDto { OrgID = 1, Subject = "test" };
        var expected = new List<InwardRegisterDto> { SampleInward() };
        _repository
            .Setup(r => r.GetInwardListAsync(filter, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var result = await CreateService().GetInwardListAsync(filter);

        Assert.Single(result);
        Assert.Equal(10, result[0].IRID);
    }

    [Fact]
    public async Task GetOutwardNextRecordNoAsync_DelegatesToRepository()
    {
        var expected = new NextRecordNoDto { NextRecordNo = 4, YIOID = 1 };
        _repository
            .Setup(r => r.GetOutwardNextRecordNoAsync(1, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var result = await CreateService().GetOutwardNextRecordNoAsync(1, 1);

        Assert.NotNull(result);
        Assert.Equal(4, result!.NextRecordNo);
        Assert.Equal(1, result.YIOID);
    }
}
