using Moq;
using SmartEPR.Core.DTOs.DocumentUpload;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class DocumentUploadServiceValidationTests
{
    private readonly Mock<IDocumentUploadRepository> _repository = new();

    private static SaveDocumentUploadRequestDto ValidSave(
        long orgId = 4,
        long srNo = 1,
        string title = "Annual Report",
        string? path = "Documents/4/report.pdf",
        long documentUploadId = 0) => new()
    {
        DocumentUploadID = documentUploadId,
        OrgID = orgId,
        SrNo = srNo,
        TDate = new DateTime(2026, 3, 15),
        DocumentTitle = title,
        DocumentPath = path
    };

    private static DocumentUploadDto Saved(
        long id = 10,
        long orgId = 4,
        long srNo = 1,
        string title = "Annual Report",
        string? path = "Documents/4/report.pdf") => new()
    {
        DocumentUploadID = id,
        OrgID = orgId,
        SrNo = srNo,
        TDate = new DateTime(2026, 3, 15),
        DocumentTitle = title,
        DocumentPath = path
    };

    private DocumentUploadService CreateService() => new(_repository.Object);

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task SaveAsync_RejectsMissingOrganization(long orgId)
    {
        var (data, error) = await CreateService().SaveAsync(ValidSave(orgId: orgId), 1);

        Assert.Null(data);
        Assert.Equal("Organization is required.", error);
        _repository.Verify(r => r.SaveAsync(It.IsAny<SaveDocumentUploadRequestDto>(), It.IsAny<long>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-2)]
    public async Task SaveAsync_RejectsMissingSrNo(long srNo)
    {
        var (data, error) = await CreateService().SaveAsync(ValidSave(srNo: srNo), 1);

        Assert.Null(data);
        Assert.Equal("Sr No is required.", error);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task SaveAsync_RejectsBlankDocumentTitle(string? title)
    {
        var (data, error) = await CreateService().SaveAsync(ValidSave(title: title!), 1);

        Assert.Null(data);
        Assert.Equal("Document title is required.", error);
    }

    [Fact]
    public async Task SaveAsync_RejectsMissingDate()
    {
        var request = ValidSave();
        request.TDate = null;

        var (data, error) = await CreateService().SaveAsync(request, 1);

        Assert.Null(data);
        Assert.Equal("Date is required.", error);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData(null)]
    public async Task SaveAsync_RequiresDocumentFileOnAdd(string? path)
    {
        var (data, error) = await CreateService().SaveAsync(ValidSave(path: path), 1);

        Assert.Null(data);
        Assert.Equal("Document file is required.", error);
    }

    [Fact]
    public async Task SaveAsync_AllowsMissingDocumentFileOnEdit()
    {
        SaveDocumentUploadRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveAsync(It.IsAny<SaveDocumentUploadRequestDto>(), It.IsAny<long>(), It.IsAny<CancellationToken>()))
            .Callback<SaveDocumentUploadRequestDto, long, CancellationToken>((dto, _, _) => captured = dto)
            .ReturnsAsync(10);
        _repository
            .Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Saved(path: "Documents/4/existing.pdf"));

        var request = ValidSave(documentUploadId: 10, path: null);

        var (data, error) = await CreateService().SaveAsync(request, 99);

        Assert.NotNull(data);
        Assert.Null(error);
        Assert.Equal(10, captured?.DocumentUploadID);
        Assert.Null(captured?.DocumentPath);
    }

    [Fact]
    public async Task SaveAsync_TrimsTitleAndPathBeforeSave()
    {
        SaveDocumentUploadRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveAsync(It.IsAny<SaveDocumentUploadRequestDto>(), It.IsAny<long>(), It.IsAny<CancellationToken>()))
            .Callback<SaveDocumentUploadRequestDto, long, CancellationToken>((dto, _, _) => captured = dto)
            .ReturnsAsync(10);
        _repository
            .Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Saved());

        var request = ValidSave(title: "  Annual Report  ", path: "  Documents/4/report.pdf  ");

        var (data, error) = await CreateService().SaveAsync(request, 1);

        Assert.NotNull(data);
        Assert.Null(error);
        Assert.Equal("Annual Report", captured?.DocumentTitle);
        Assert.Equal("Documents/4/report.pdf", captured?.DocumentPath);
    }

    [Fact]
    public async Task SaveAsync_ReturnsSavedRecordOnAdd()
    {
        _repository
            .Setup(r => r.SaveAsync(It.IsAny<SaveDocumentUploadRequestDto>(), It.IsAny<long>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(10);
        _repository
            .Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Saved());

        var (data, error) = await CreateService().SaveAsync(ValidSave(), 5);

        Assert.NotNull(data);
        Assert.Null(error);
        Assert.Equal(10, data.DocumentUploadID);
        Assert.Equal("Annual Report", data.DocumentTitle);
    }

    [Fact]
    public async Task SaveAsync_ReturnsSavedRecordOnEdit()
    {
        _repository
            .Setup(r => r.SaveAsync(It.IsAny<SaveDocumentUploadRequestDto>(), It.IsAny<long>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(10);
        _repository
            .Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Saved(title: "Updated Circular"));

        var (data, error) = await CreateService().SaveAsync(ValidSave(documentUploadId: 10, title: "Updated Circular"), 5);

        Assert.NotNull(data);
        Assert.Null(error);
        Assert.Equal("Updated Circular", data.DocumentTitle);
    }

    [Fact]
    public async Task SaveAsync_ReturnsErrorWhenReloadFails()
    {
        _repository
            .Setup(r => r.SaveAsync(It.IsAny<SaveDocumentUploadRequestDto>(), It.IsAny<long>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(10);
        _repository
            .Setup(r => r.GetByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync((DocumentUploadDto?)null);

        var (data, error) = await CreateService().SaveAsync(ValidSave(), 5);

        Assert.Null(data);
        Assert.Equal("Unable to save document upload.", error);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public async Task DeleteAsync_RejectsInvalidId(long documentUploadId)
    {
        var (success, error) = await CreateService().DeleteAsync(documentUploadId, 1);

        Assert.False(success);
        Assert.Equal("Document is required.", error);
        _repository.Verify(r => r.DeleteAsync(It.IsAny<long>(), It.IsAny<long>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task DeleteAsync_SucceedsForValidId()
    {
        _repository
            .Setup(r => r.DeleteAsync(10, 5, It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var (success, error) = await CreateService().DeleteAsync(10, 5);

        Assert.True(success);
        Assert.Null(error);
    }

    [Fact]
    public async Task GetListAsync_DelegatesToRepository()
    {
        var expected = new List<DocumentUploadDto> { Saved() };
        _repository
            .Setup(r => r.GetListAsync(4, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expected);

        var result = await CreateService().GetListAsync(4);

        Assert.Single(result);
        Assert.Equal(10, result[0].DocumentUploadID);
    }

    [Fact]
    public async Task GetNextSrNoAsync_DelegatesToRepository()
    {
        _repository
            .Setup(r => r.GetNextSrNoAsync(4, It.IsAny<CancellationToken>()))
            .ReturnsAsync(7);

        var result = await CreateService().GetNextSrNoAsync(4);

        Assert.Equal(7, result);
    }
}
