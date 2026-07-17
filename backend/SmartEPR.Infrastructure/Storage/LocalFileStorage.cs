using Microsoft.Extensions.Configuration;
using SmartEPR.Core.Interfaces;

namespace SmartEPR.Infrastructure.Storage;

public sealed class LocalFileStorage : ILocalFileStorage
{
    private readonly string _rootPath;

    /// <summary>
    /// Production: root = FileStorage:RootPath or {contentRootPath}/Uploads.
    /// </summary>
    public LocalFileStorage(string contentRootPath, IConfiguration configuration)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(contentRootPath);
        ArgumentNullException.ThrowIfNull(configuration);

        var configured = configuration["FileStorage:RootPath"];
        _rootPath = string.IsNullOrWhiteSpace(configured)
            ? Path.GetFullPath(Path.Combine(contentRootPath, "Uploads"))
            : Path.GetFullPath(configured);
        Directory.CreateDirectory(_rootPath);
    }

    /// <summary>Test helper — explicit Uploads root directory.</summary>
    public static LocalFileStorage ForTesting(string uploadsRootPath)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(uploadsRootPath);
        return new LocalFileStorage(uploadsRootPath, isUploadsRoot: true);
    }

    private LocalFileStorage(string uploadsRootPath, bool isUploadsRoot)
    {
        if (!isUploadsRoot)
            throw new InvalidOperationException();
        _rootPath = Path.GetFullPath(uploadsRootPath);
        Directory.CreateDirectory(_rootPath);
    }

    public string RootPath => _rootPath;

    public async Task<string> SaveAsync(
        string featureFolder,
        long orgId,
        Stream content,
        string originalFileName,
        CancellationToken cancellationToken = default)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(featureFolder);
        ArgumentNullException.ThrowIfNull(content);

        var safeFeature = SanitizeSegment(featureFolder);
        var orgSegment = orgId > 0 ? orgId.ToString() : "0";
        var ext = Path.GetExtension(originalFileName ?? string.Empty);
        if (string.IsNullOrWhiteSpace(ext) || ext.Length > 12)
            ext = ".bin";
        ext = ext.ToLowerInvariant();

        var fileName = $"{Guid.NewGuid():N}{ext}";
        var relative = $"{safeFeature}/{orgSegment}/{fileName}";
        var physicalDir = Path.Combine(_rootPath, safeFeature, orgSegment);
        Directory.CreateDirectory(physicalDir);
        var physicalPath = Path.Combine(physicalDir, fileName);

        await using var fs = new FileStream(physicalPath, FileMode.CreateNew, FileAccess.Write, FileShare.None);
        await content.CopyToAsync(fs, cancellationToken).ConfigureAwait(false);

        return relative;
    }

    public string? ResolvePhysicalPath(string featureFolder, string? relativeOrFileName)
    {
        if (!IsSafeRelativePath(relativeOrFileName))
            return null;

        var safeFeature = SanitizeSegment(featureFolder);
        var normalized = relativeOrFileName!.Replace('\\', '/').Trim().TrimStart('/');

        string candidateRelative;
        if (normalized.Contains('/', StringComparison.Ordinal))
        {
            if (normalized.StartsWith(safeFeature + "/", StringComparison.OrdinalIgnoreCase))
                candidateRelative = normalized;
            else
                candidateRelative = $"{safeFeature}/{normalized}";
        }
        else
        {
            // Legacy flat filename under feature root
            candidateRelative = $"{safeFeature}/{normalized}";
        }

        var full = Path.GetFullPath(Path.Combine(_rootPath, candidateRelative.Replace('/', Path.DirectorySeparatorChar)));
        var rootFull = Path.GetFullPath(_rootPath);
        var prefix = rootFull.EndsWith(Path.DirectorySeparatorChar)
            ? rootFull
            : rootFull + Path.DirectorySeparatorChar;
        if (!full.StartsWith(prefix, StringComparison.OrdinalIgnoreCase)
            && !string.Equals(full, rootFull, StringComparison.OrdinalIgnoreCase))
            return null;

        return File.Exists(full) ? full : null;
    }

    public bool IsSafeRelativePath(string? relativeOrFileName)
    {
        if (string.IsNullOrWhiteSpace(relativeOrFileName))
            return false;

        var value = relativeOrFileName.Trim();
        if (value.Contains("..", StringComparison.Ordinal))
            return false;
        if (Path.IsPathRooted(value))
            return false;
        if (value.Contains(':', StringComparison.Ordinal))
            return false;
        if (value.StartsWith("http:", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("https:", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("gs:", StringComparison.OrdinalIgnoreCase)
            || value.StartsWith("s3:", StringComparison.OrdinalIgnoreCase))
            return false;

        return true;
    }

    private static string SanitizeSegment(string segment)
    {
        var trimmed = segment.Trim().Replace('\\', '/').Trim('/');
        if (string.IsNullOrWhiteSpace(trimmed)
            || trimmed.Contains("..", StringComparison.Ordinal)
            || trimmed.Contains('/', StringComparison.Ordinal))
            throw new ArgumentException("Invalid feature folder.", nameof(segment));
        return trimmed;
    }
}
