const MIC_CHECKED_KEY = 'versant.micChecked';

let remembered = false;

export function micChecked(): boolean {
  if (remembered) return true;
  try {
    remembered = localStorage.getItem(MIC_CHECKED_KEY) === '1';
  } catch {
    remembered = false;
  }
  return remembered;
}

export function markMicChecked(): void {
  remembered = true;
  try {
    localStorage.setItem(MIC_CHECKED_KEY, '1');
  } catch {
    // Private mode can block storage. This visit still counts as checked.
  }
}
