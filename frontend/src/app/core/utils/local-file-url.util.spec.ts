import { encodeRelativeStoragePath } from './local-file-url.util';

describe('encodeRelativeStoragePath', () => {
  it('encodes nested OrgID paths without collapsing slashes', () => {
    expect(encodeRelativeStoragePath('TeacherPhotos/12/abc.jpg')).toBe('TeacherPhotos/12/abc.jpg');
  });

  it('encodes spaces and special characters per segment', () => {
    expect(encodeRelativeStoragePath('Tickets/4/my file.pdf')).toBe('Tickets/4/my%20file.pdf');
  });

  it('normalizes backslashes', () => {
    expect(encodeRelativeStoragePath('TeacherDocuments\\9\\x.png')).toBe('TeacherDocuments/9/x.png');
  });

  it('supports legacy flat filenames', () => {
    expect(encodeRelativeStoragePath('legacy-guid.jpg')).toBe('legacy-guid.jpg');
  });
});
