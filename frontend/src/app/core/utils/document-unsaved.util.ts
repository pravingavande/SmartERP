import { OrganizationDocumentLine } from '../models/organization.model';
import { TeacherDocumentLine } from '../models/teacher.model';

export const ORGANIZATION_DOCUMENTS_UNSAVED_MESSAGE =
  'You have unsaved document changes. Please click Save Documents before leaving this section.';

export const TEACHER_DOCUMENTS_UNSAVED_MESSAGE =
  'You have unsaved document changes. Please click Save Documents before leaving this section.';

export function serializeOrganizationDocuments(docs: OrganizationDocumentLine[]): string {
  return JSON.stringify(
    docs.map((d) => ({
      documentID: d.documentID ?? null,
      documentPath: d.documentPath?.trim() || null
    }))
  );
}

export function serializeTeacherDocuments(docs: TeacherDocumentLine[]): string {
  return JSON.stringify(
    docs.map((d) => ({
      empDocumentCode: d.empDocumentCode ?? null,
      empDocumentPath: d.empDocumentPath?.trim() || ''
    }))
  );
}

export const DUPLICATE_DOCUMENT_NAME_MESSAGE = 'This document name is already selected in another row.';

export function getDuplicateDocumentNameError(ids: Array<number | null | undefined>): string | null {
  const seen = new Set<number>();
  for (const id of ids) {
    if (!id || id <= 0) continue;
    if (seen.has(id)) return DUPLICATE_DOCUMENT_NAME_MESSAGE;
    seen.add(id);
  }
  return null;
}
