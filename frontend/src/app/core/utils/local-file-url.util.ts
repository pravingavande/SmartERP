/**
 * Encodes a DB-relative storage path for HTTP routes with catch-all segments.
 * Example: TeacherPhotos/12/a1b2.jpg → TeacherPhotos/12/a1b2.jpg (each segment encoded).
 */
export function encodeRelativeStoragePath(relativePath: string): string {
  return relativePath
    .replace(/\\/g, '/')
    .split('/')
    .filter((s) => s.length > 0)
    .map((s) => encodeURIComponent(s))
    .join('/');
}
