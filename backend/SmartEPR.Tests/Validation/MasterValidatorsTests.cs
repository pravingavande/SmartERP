using SmartEPR.Core.Validation;
using Xunit;

namespace SmartEPR.Tests.Validation;

public sealed class MasterValidatorsTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void RequireText_ReturnsError_WhenBlank(string? value)
    {
        var error = MasterValidators.RequireText(value, "Subject name");
        Assert.Equal("Subject name is required.", error);
    }

    [Fact]
    public void RequireText_ReturnsNull_WhenProvided()
    {
        var error = MasterValidators.RequireText(" Mathematics ", "Subject name");
        Assert.Null(error);
    }

    [Fact]
    public void Trim_RemovesWhitespace()
    {
        Assert.Equal("Science", MasterValidators.Trim("  Science  "));
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void RequirePositiveId_ReturnsError_WhenInvalid(long value)
    {
        var error = MasterValidators.RequirePositiveId(value, "Organization");
        Assert.Equal("Organization is required.", error);
    }

    [Theory]
    [InlineData(-5)]
    [InlineData(-0.01)]
    public void RequireNonNegativeDecimal_ReturnsError_WhenNegative(decimal value)
    {
        var error = MasterValidators.RequireNonNegativeDecimal(value, "Rate");
        Assert.Equal("Rate must be greater than or equal to zero.", error);
    }

    [Theory]
    [InlineData(0)]
    [InlineData(-1)]
    public void RequirePositiveDecimal_ReturnsError_WhenNotPositive(decimal value)
    {
        var error = MasterValidators.RequirePositiveDecimal(value, "Quantity");
        Assert.Equal("Quantity must be greater than zero.", error);
    }
}
