using Moq;
using SmartEPR.Core.DTOs.Master;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class MasterServiceValidationTests
{
    private readonly Mock<IMasterRepository> _repository = new();

    [Fact]
    public async Task SaveSubjectAsync_RejectsBlankSubjectName()
    {
        var service = new MasterService(_repository.Object);
        var request = new SaveSubjectRequestDto { UnderOrgID = 1, SubjectName = "   " };

        var (data, error) = await service.SaveSubjectAsync(request);

        Assert.Null(data);
        Assert.Equal("Subject name is required.", error);
        _repository.Verify(r => r.SaveSubjectAsync(It.IsAny<SaveSubjectRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SaveClassAsync_TrimsClassNameBeforeSave()
    {
        SaveClassRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveClassAsync(It.IsAny<SaveClassRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveClassRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(10);
        _repository
            .Setup(r => r.GetClassByIdAsync(10, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ClassMasterDto { ClassID = 10, OrgID = 1, SrNo = 1, ClassName = "Grade 1", IsActive = true });

        var service = new MasterService(_repository.Object);
        var (data, error) = await service.SaveClassAsync(new SaveClassRequestDto
        {
            OrgID = 1,
            SrNo = 1,
            ClassName = "  Grade 1  "
        });

        Assert.NotNull(data);
        Assert.Null(error);
        Assert.Equal("Grade 1", captured?.ClassName);
    }

    [Fact]
    public async Task SaveClassAsync_RejectsMissingOrgAndSrNo()
    {
        var service = new MasterService(_repository.Object);
        var (data, error) = await service.SaveClassAsync(new SaveClassRequestDto { ClassName = "Grade 1" });

        Assert.Null(data);
        Assert.Equal("Organization is required.", error);
        _repository.Verify(r => r.SaveClassAsync(It.IsAny<SaveClassRequestDto>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task SaveItemAsync_RejectsMissingItemGroup()
    {
        var service = new MasterService(_repository.Object);
        var request = new SaveItemRequestDto
        {
            OrgID = 1,
            ItemGroupID = 0,
            ItemName = "Pen",
            Rate = 10
        };

        var (data, error) = await service.SaveItemAsync(request);

        Assert.Null(data);
        Assert.Equal("Item group is required.", error);
    }

    [Fact]
    public async Task SaveStockAsync_RejectsZeroQuantity()
    {
        var service = new MasterService(_repository.Object);
        var request = new SaveStockRequestDto
        {
            OrgID = 1,
            ItemID = 2,
            Qty = 0,
            Rate = 10
        };

        var (data, error) = await service.SaveStockAsync(request);

        Assert.Null(data);
        Assert.Equal("Quantity must be greater than zero.", error);
    }
}
