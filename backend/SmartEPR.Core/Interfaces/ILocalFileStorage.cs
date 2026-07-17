namespace SmartEPR.Core.Interfaces;

/// <summary>
/// Project-folder file storage. Physical root: {ContentRoot}/Uploads/{feature}/{orgId}/file.
/// Database stores only the relative path (URL-like), never a full disk path or cloud URI.
/// </summary>
public interface ILocalFileStorage
{
    /// <summary>Root folder under the API project (e.g. .../SmartEPR.Api/Uploads).</summary>
    string RootPath { get; }

    /// <summary>
    /// Saves stream under Uploads/{feature}/{orgId}/{guid}{ext}.
    /// Returns relative path for DB, e.g. TeacherPhotos/12/a1b2c3.jpg
    /// </summary>
    Task<string> SaveAsync(
        string featureFolder,
        long orgId,
        Stream content,
        string originalFileName,
        CancellationToken cancellationToken = default);

    /// <summary>
    /// Resolves a DB relative path (or legacy flat filename) to a physical file path under Uploads.
    /// Returns null if missing or path escapes the root.
    /// </summary>
    string? ResolvePhysicalPath(string featureFolder, string? relativeOrFileName);

    /// <summary>True when value looks like a safe relative storage path (no .., no rooted path).</summary>
    bool IsSafeRelativePath(string? relativeOrFileName);
}
