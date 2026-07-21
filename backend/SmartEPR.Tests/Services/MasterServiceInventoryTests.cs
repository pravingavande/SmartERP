using Moq;
using SmartEPR.Core.DTOs.Master;
using SmartEPR.Core.Interfaces;
using SmartEPR.Infrastructure.Services;
using Xunit;

namespace SmartEPR.Tests.Services;

public sealed class MasterServiceInventoryTests
{
    private readonly Mock<IMasterRepository> _repository = new();

    private MasterService CreateService() => new(_repository.Object);

    // ---- Item Group ----

    [Fact]
    public async Task SaveItemGroupAsync_RejectsMissingOrg()
    {
        var (data, error) = await CreateService().SaveItemGroupAsync(new SaveItemGroupRequestDto
        {
            OrgID = 0,
            ItemGroupName = "Stationery"
        });

        Assert.Null(data);
        Assert.Equal("Organization is required.", error);
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task SaveItemGroupAsync_RejectsBlankName(string name)
    {
        var (data, error) = await CreateService().SaveItemGroupAsync(new SaveItemGroupRequestDto
        {
            OrgID = 1,
            ItemGroupName = name
        });

        Assert.Null(data);
        Assert.Equal("Item group name is required.", error);
    }

    [Fact]
    public async Task SaveItemGroupAsync_TrimsName_AndSupportsUpdate()
    {
        SaveItemGroupRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveItemGroupAsync(It.IsAny<SaveItemGroupRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveItemGroupRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(8);
        _repository
            .Setup(r => r.GetItemGroupByIdAsync(8, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ItemGroupMasterDto { ItemGroupID = 8, OrgID = 1, ItemGroupName = "Stationery", IsActive = true });

        var (data, error) = await CreateService().SaveItemGroupAsync(new SaveItemGroupRequestDto
        {
            ItemGroupID = 8,
            OrgID = 1,
            ItemGroupName = "  Stationery  "
        });

        Assert.Null(error);
        Assert.Equal(8, captured?.ItemGroupID);
        Assert.Equal("Stationery", captured?.ItemGroupName);
        Assert.Equal(8, data!.ItemGroupID);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task DeleteItemGroupAsync_RejectsInvalidId(long id)
    {
        var (success, error) = await CreateService().DeleteItemGroupAsync(id);
        Assert.False(success);
        Assert.Equal("Item group is required.", error);
    }

    [Fact]
    public async Task DeleteItemGroupAsync_CallsRepository()
    {
        _repository.Setup(r => r.DeleteItemGroupAsync(8, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        var (success, error) = await CreateService().DeleteItemGroupAsync(8);
        Assert.True(success);
        Assert.Null(error);
    }

    // ---- Subject ----

    [Fact]
    public async Task SaveSubjectAsync_Update_PersistsIdAndTrim()
    {
        SaveSubjectRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveSubjectAsync(It.IsAny<SaveSubjectRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveSubjectRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(3);
        _repository
            .Setup(r => r.GetSubjectByIdAsync(3, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new SubjectMasterDto { SubjectID = 3, SubjectName = "Maths", IsActive = true });

        var (data, error) = await CreateService().SaveSubjectAsync(new SaveSubjectRequestDto
        {
            SubjectID = 3,
            UnderOrgID = 1,
            SubjectName = "  Maths  "
        });

        Assert.Null(error);
        Assert.Equal(3, captured?.SubjectID);
        Assert.Equal("Maths", captured?.SubjectName);
        Assert.Equal(3, data!.SubjectID);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task DeleteSubjectAsync_RejectsInvalidId(long id)
    {
        var (success, error) = await CreateService().DeleteSubjectAsync(id);
        Assert.False(success);
        Assert.Equal("Subject is required.", error);
    }

    [Fact]
    public async Task DeleteSubjectAsync_CallsRepository()
    {
        _repository.Setup(r => r.DeleteSubjectAsync(3, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        var (success, error) = await CreateService().DeleteSubjectAsync(3);
        Assert.True(success);
        Assert.Null(error);
    }

    // ---- Item ----

    [Fact]
    public async Task SaveItemAsync_RejectsBlankName()
    {
        var (data, error) = await CreateService().SaveItemAsync(new SaveItemRequestDto
        {
            OrgID = 1,
            ItemGroupID = 2,
            ItemName = "  ",
            Rate = 10
        });

        Assert.Null(data);
        Assert.Equal("Item name is required.", error);
    }

    [Fact]
    public async Task SaveItemAsync_RejectsNegativeRate()
    {
        var (data, error) = await CreateService().SaveItemAsync(new SaveItemRequestDto
        {
            OrgID = 1,
            ItemGroupID = 2,
            ItemName = "Pen",
            Rate = -1
        });

        Assert.Null(data);
        Assert.Equal("Rate must be greater than or equal to zero.", error);
    }

    [Fact]
    public async Task SaveItemAsync_Update_TrimsAndPersists()
    {
        SaveItemRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveItemAsync(It.IsAny<SaveItemRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveItemRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(15);
        _repository
            .Setup(r => r.GetItemByIdAsync(15, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ItemMasterDto { ItemID = 15, OrgID = 1, ItemGroupID = 2, ItemName = "Pen", Rate = 10, IsActive = true });

        var (data, error) = await CreateService().SaveItemAsync(new SaveItemRequestDto
        {
            ItemID = 15,
            OrgID = 1,
            ItemGroupID = 2,
            ItemName = "  Pen  ",
            Rate = 10
        });

        Assert.Null(error);
        Assert.Equal(15, captured?.ItemID);
        Assert.Equal("Pen", captured?.ItemName);
        Assert.Equal(15, data!.ItemID);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-3)]
    public async Task DeleteItemAsync_RejectsInvalidId(long id)
    {
        var (success, error) = await CreateService().DeleteItemAsync(id);
        Assert.False(success);
        Assert.Equal("Item is required.", error);
    }

    // ---- Stock ----

    [Fact]
    public async Task SaveStockAsync_RejectsMissingItem()
    {
        var (data, error) = await CreateService().SaveStockAsync(new SaveStockRequestDto
        {
            OrgID = 1,
            ItemID = 0,
            Qty = 5,
            Rate = 2
        });

        Assert.Null(data);
        Assert.Equal("Item is required.", error);
    }

    [Fact]
    public async Task SaveStockAsync_RejectsNegativeRate()
    {
        var (data, error) = await CreateService().SaveStockAsync(new SaveStockRequestDto
        {
            OrgID = 1,
            ItemID = 2,
            Qty = 5,
            Rate = -1
        });

        Assert.Null(data);
        Assert.Equal("Rate must be greater than or equal to zero.", error);
    }

    [Fact]
    public async Task SaveStockAsync_TrimsRemark_AndSupportsUpdate()
    {
        SaveStockRequestDto? captured = null;
        _repository
            .Setup(r => r.SaveStockAsync(It.IsAny<SaveStockRequestDto>(), It.IsAny<CancellationToken>()))
            .Callback<SaveStockRequestDto, CancellationToken>((dto, _) => captured = dto)
            .ReturnsAsync(22);
        _repository
            .Setup(r => r.GetStockByIdAsync(22, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new StockRegisterDto { StockID = 22, OrgID = 1, ItemID = 2, Qty = 5, Rate = 10, Amount = 50 });

        var (data, error) = await CreateService().SaveStockAsync(new SaveStockRequestDto
        {
            StockID = 22,
            OrgID = 1,
            ItemID = 2,
            Qty = 5,
            Rate = 10,
            Remark = "  Opening  "
        });

        Assert.Null(error);
        Assert.Equal(22, captured?.StockID);
        Assert.Equal("Opening", captured?.Remark);
        Assert.Equal(22, data!.StockID);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public async Task DeleteStockAsync_RejectsInvalidId(long id)
    {
        var (success, error) = await CreateService().DeleteStockAsync(id);
        Assert.False(success);
        Assert.Equal("Stock entry is required.", error);
    }

    [Fact]
    public async Task DeleteStockAsync_CallsRepository()
    {
        _repository.Setup(r => r.DeleteStockAsync(22, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
        var (success, error) = await CreateService().DeleteStockAsync(22);
        Assert.True(success);
        Assert.Null(error);
    }
}
