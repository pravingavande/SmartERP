using Moq;
using SmartEPR.Core.DTOs.Master;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class MasterServiceDocumentCategorySubjectTests
{
    private readonly Mock<IMasterRepository> _repository = new();

    private MasterService CreateService() => new(_repository.Object);

    [Fact]
    public async Task ImportDocumentsAsync_RejectsSourceOrgDestination()
    {
        var (data, error) = await CreateService().ImportDocumentsAsync(new ImportDocumentRequestDto
        {
            DestinationOrgID = 1,
            DocumentIds = [1, 2]
        });

        Assert.Null(data);
        Assert.Equal("Cannot import into the source organization.", error);
    }

    [Fact]
    public async Task ImportDocumentsAsync_RejectsEmptySelection()
    {
        var (data, error) = await CreateService().ImportDocumentsAsync(new ImportDocumentRequestDto
        {
            DestinationOrgID = 13,
            DocumentIds = []
        });

        Assert.Null(data);
        Assert.Equal("Select at least one document to import.", error);
    }

    [Fact]
    public async Task ImportCategoriesAsync_RejectsSourceOrgDestination()
    {
        var (data, error) = await CreateService().ImportCategoriesAsync(new ImportCategoryRequestDto
        {
            DestinationOrgID = 1,
            CategoryIds = [1]
        });

        Assert.Null(data);
        Assert.Equal("Cannot import into the source organization.", error);
    }

    [Fact]
    public async Task ImportSubjectsAsync_RejectsSourceOrgDestination()
    {
        var (data, error) = await CreateService().ImportSubjectsAsync(new ImportSubjectRequestDto
        {
            DestinationOrgID = 1,
            SubjectIds = [1]
        });

        Assert.Null(data);
        Assert.Equal("Cannot import into the source organization.", error);
    }

    [Fact]
    public async Task GetDocumentListAsync_CallsRepositoryWithOrgId()
    {
        _repository
            .Setup(r => r.GetDocumentListAsync(1, null, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<DocumentMasterDto>
            {
                new() { DocumentID = 1, UnderOrgID = 1, SrNo = 1, DocumentName = "Aadhar", IsActive = true }
            });

        var items = await CreateService().GetDocumentListAsync(1, null);

        Assert.Single(items);
        Assert.Equal("Aadhar", items[0].DocumentName);
    }
}
