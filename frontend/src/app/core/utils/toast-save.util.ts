import { ToastService } from '../services/toast.service';

export function toastOnSave(
  toast: ToastService,
  success: boolean,
  options: { entity: string; mode?: 'new' | 'edit' | 'view'; errorMessage?: string }
): void {
  const saveMode = options.mode === 'edit' || options.mode === 'view' ? 'edit' : 'new';
  if (success) {
    const message =
      saveMode === 'edit'
        ? `${options.entity} updated successfully.`
        : `${options.entity} saved successfully.`;
    toast.showSuccess(message, saveMode === 'edit' ? 'Updated' : 'Saved');
    return;
  }
  toast.showError(
    options.errorMessage ?? `Unable to save ${options.entity.toLowerCase()}. Please try again.`,
    'Save failed'
  );
}
