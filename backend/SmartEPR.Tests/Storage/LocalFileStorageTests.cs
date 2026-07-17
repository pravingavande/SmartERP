using SmartEPR.Infrastructure.Storage;
using Xunit;

namespace SmartEPR.Tests.Storage;

public sealed class LocalFileStorageTests : IDisposable
{
    private readonly string _tempRoot;
    private readonly LocalFileStorage _storage;

    public LocalFileStorageTests()
    {
        _tempRoot = Path.Combine(Path.GetTempPath(), "SmartEPR-LocalFileStorage-" + Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(_tempRoot);
        _storage = LocalFileStorage.ForTesting(_tempRoot);
    }

    public void Dispose()
    {
        try
        {
            if (Directory.Exists(_tempRoot))
                Directory.Delete(_tempRoot, recursive: true);
        }
        catch
        {
            // best-effort cleanup
        }
    }

    [Fact]
    public async Task SaveAsync_StoresUnderFeatureAndOrgId_AndReturnsRelativePathOnly()
    {
        await using var content = new MemoryStream("teacher-photo"u8.ToArray());

        var relative = await _storage.SaveAsync("TeacherPhotos", 12, content, "My Photo.JPG");

        Assert.StartsWith("TeacherPhotos/12/", relative, StringComparison.Ordinal);
        Assert.EndsWith(".jpg", relative, StringComparison.Ordinal);
        Assert.DoesNotContain(":", relative); // no drive letter / URI scheme
        Assert.DoesNotContain("\\", relative);
        Assert.False(Path.IsPathRooted(relative));

        var physical = Path.Combine(_tempRoot, relative.Replace('/', Path.DirectorySeparatorChar));
        Assert.True(File.Exists(physical));
        Assert.Equal("teacher-photo", await File.ReadAllTextAsync(physical));
    }

    [Fact]
    public async Task SaveAsync_OrganizationDocuments_UsesOrgFolder()
    {
        await using var content = new MemoryStream([1, 2, 3]);
        var relative = await _storage.SaveAsync("OrganizationDocuments", 4, content, "school.pdf");

        Assert.Equal($"OrganizationDocuments/4/{Path.GetFileName(relative)}", relative);
        Assert.True(Directory.Exists(Path.Combine(_tempRoot, "OrganizationDocuments", "4")));
    }

    [Fact]
    public async Task SaveAsync_ZeroOrgId_UsesZeroFolder()
    {
        await using var content = new MemoryStream([9]);
        var relative = await _storage.SaveAsync("Tickets", 0, content, "a.bin");
        Assert.StartsWith("Tickets/0/", relative, StringComparison.Ordinal);
    }

    [Theory]
    [InlineData("TeacherPhotos", "TeacherPhotos/12/abc.jpg")]
    [InlineData("TeacherPhotos", "12/abc.jpg")]
    [InlineData("TeacherDocuments", "legacy-flat.pdf")]
    public async Task ResolvePhysicalPath_FindsOrgNestedAndLegacyFlat(string feature, string key)
    {
        var featureDir = Path.Combine(_tempRoot, feature);
        Directory.CreateDirectory(featureDir);

        string physicalExpected;
        if (key.Contains('/'))
        {
            var underFeature = key.StartsWith(feature + "/", StringComparison.OrdinalIgnoreCase)
                ? key[(feature.Length + 1)..]
                : key;
            physicalExpected = Path.Combine(featureDir, underFeature.Replace('/', Path.DirectorySeparatorChar));
            Directory.CreateDirectory(Path.GetDirectoryName(physicalExpected)!);
        }
        else
        {
            physicalExpected = Path.Combine(featureDir, key);
        }

        await File.WriteAllTextAsync(physicalExpected, "ok");

        var resolved = _storage.ResolvePhysicalPath(feature, key);
        Assert.NotNull(resolved);
        Assert.True(File.Exists(resolved));
        Assert.Equal(Path.GetFullPath(physicalExpected), Path.GetFullPath(resolved!));
    }

    [Theory]
    [InlineData("../secret.txt")]
    [InlineData("TeacherPhotos/../secret.txt")]
    [InlineData("TeacherPhotos/12/../../secret.txt")]
    [InlineData("C:\\Windows\\win.ini")]
    [InlineData("/etc/passwd")]
    public void ResolvePhysicalPath_RejectsPathTraversalAndRootedPaths(string malicious)
    {
        Assert.Null(_storage.ResolvePhysicalPath("TeacherPhotos", malicious));
        Assert.False(_storage.IsSafeRelativePath(malicious));
    }

    [Theory]
    [InlineData("https://storage.googleapis.com/bucket/x.jpg")]
    [InlineData("http://cdn.example.com/a.pdf")]
    [InlineData("gs://my-bucket/TeacherPhotos/1/a.jpg")]
    [InlineData("s3://bucket/key")]
    public void IsSafeRelativePath_RejectsCloudAndHttpUris(string uri)
    {
        Assert.False(_storage.IsSafeRelativePath(uri));
        Assert.Null(_storage.ResolvePhysicalPath("TeacherPhotos", uri));
    }

    [Fact]
    public void IsSafeRelativePath_AcceptsRelativeOrgPath()
    {
        Assert.True(_storage.IsSafeRelativePath("TeacherPhotos/12/abcdef0123456789.jpg"));
        Assert.True(_storage.IsSafeRelativePath("legacy-guid.png"));
    }

    [Fact]
    public async Task ResolvePhysicalPath_DoesNotEscapeUploadsRootEvenIfFileExistsOutside()
    {
        var outside = Path.Combine(Path.GetTempPath(), "SmartEPR-outside-" + Guid.NewGuid().ToString("N") + ".txt");
        await File.WriteAllTextAsync(outside, "leak");
        try
        {
            var relativeEscape = Path.GetRelativePath(_tempRoot, outside).Replace('\\', '/');
            // If relative path still contains .. it must be rejected
            Assert.Contains("..", relativeEscape, StringComparison.Ordinal);
            Assert.Null(_storage.ResolvePhysicalPath("TeacherPhotos", relativeEscape));
        }
        finally
        {
            File.Delete(outside);
        }
    }

    [Fact]
    public async Task SaveAsync_NeverReturnsGcpOrAbsolutePath()
    {
        await using var content = new MemoryStream([1]);
        var relative = await _storage.SaveAsync("Events", 99, content, "news.png");

        Assert.DoesNotContain("gs://", relative, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("googleapis", relative, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain("s3://", relative, StringComparison.OrdinalIgnoreCase);
        Assert.DoesNotContain(_tempRoot, relative, StringComparison.OrdinalIgnoreCase);
        Assert.Matches(@"^Events/99/[0-9a-f]{32}\.png$", relative);
    }

    [Fact]
    public async Task SanitizeFeature_RejectsTraversalFeatureName()
    {
        await using var content = new MemoryStream([1]);
        await Assert.ThrowsAsync<ArgumentException>(() =>
            _storage.SaveAsync("../evil", 1, content, "a.txt"));
    }
}
