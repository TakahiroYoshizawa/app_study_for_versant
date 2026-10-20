export function formatSeconds(ms: number | null): string {
  if (ms == null) return '—';
  return `${(ms / 1000).toFixed(1)}秒`;
}

export function formatWhen(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('ja-JP', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function endLabel(end: 'silence' | 'timeout' | 'no-response' | 'manual'): string {
  if (end === 'silence') return '話し終えて終了';
  if (end === 'timeout') return '15秒で終了';
  if (end === 'manual') return '自分で終了';
  return '無回答';
}

export async function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('read-failed'));
    reader.readAsDataURL(blob);
  });
}
