type RecognitionAlternative = { transcript: string };
type RecognitionResult = { isFinal: boolean; 0: RecognitionAlternative };
type RecognitionEvent = { results: ArrayLike<RecognitionResult> };

export type BrowserRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: RecognitionEvent) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
};

const pendingSpeeches = new Set<() => void>();
let lastCancelAt = 0;

function speechWindow(): Window & {
  SpeechRecognition?: new () => BrowserRecognition;
  webkitSpeechRecognition?: new () => BrowserRecognition;
} {
  return window;
}

export function recognitionSupported(): boolean {
  const host = speechWindow();
  return Boolean(host.SpeechRecognition || host.webkitSpeechRecognition);
}

export function createRecognition(): BrowserRecognition | null {
  const host = speechWindow();
  const Ctor = host.SpeechRecognition ?? host.webkitSpeechRecognition;
  if (!Ctor) return null;
  const recognition = new Ctor();
  recognition.lang = 'en-US';
  recognition.continuous = true;
  recognition.interimResults = true;
  return recognition;
}

export function transcriptFrom(event: RecognitionEvent): string {
  let finalText = '';
  let interim = '';
  for (let index = 0; index < event.results.length; index += 1) {
    const result = event.results[index];
    const piece = result?.[0]?.transcript ?? '';
    if (result?.isFinal) finalText += `${piece} `;
    else interim += piece;
  }
  return `${finalText}${interim}`.replace(/\s+/g, ' ').trim();
}

export function primeVoices(): void {
  const synth = window.speechSynthesis;
  if (!synth) return;
  synth.getVoices();
  synth.addEventListener('voiceschanged', () => {
    synth.getVoices();
  });
}

function englishVoices(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice[] {
  return voices.filter((voice) => voice.lang.toLowerCase().startsWith('en'));
}

function pickVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const english = englishVoices(voices);
  return (
    english.find((voice) => voice.lang === 'en-US' && /google/i.test(voice.name)) ??
    english.find((voice) => voice.lang === 'en-US') ??
    english.find((voice) => voice.lang === 'en-GB') ??
    english[0] ??
    null
  );
}

function pickGoogleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const google = englishVoices(voices).filter((voice) => /google/i.test(voice.name));
  return google.find((voice) => voice.lang === 'en-US') ?? google[0] ?? null;
}

function pickMaleVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const googleMale = englishVoices(voices).filter(
    (voice) => /google/i.test(voice.name) && /\bmale\b/i.test(voice.name),
  );
  return googleMale.find((voice) => voice.lang === 'en-GB') ?? googleMale[0] ?? null;
}

export function cancelSpeech(): void {
  lastCancelAt = Date.now();
  window.speechSynthesis?.cancel();
  pendingSpeeches.forEach((finish) => finish());
  pendingSpeeches.clear();
}

function waitForVoices(preferGoogle = false): Promise<void> {
  const synth = window.speechSynthesis;
  if (!synth) return Promise.resolve();
  const ready = () => {
    const voices = synth.getVoices();
    if (voices.length === 0) return false;
    if (!preferGoogle) return true;
    return voices.some((voice) => /google/i.test(voice.name));
  };
  if (ready()) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      synth.removeEventListener('voiceschanged', onChange);
      window.clearTimeout(timer);
      resolve();
    };
    const onChange = () => {
      if (ready()) done();
    };
    const timer = window.setTimeout(done, 1500);
    synth.addEventListener('voiceschanged', onChange);
    synth.getVoices();
  });
}

export function englishVoiceLabel(): string | null {
  const synth = window.speechSynthesis;
  if (!synth) return null;
  const voice = pickVoice(synth.getVoices());
  return voice ? `${voice.name}（${voice.lang}）` : null;
}

export function canSpeak(): boolean {
  return typeof window.speechSynthesis !== 'undefined';
}

export type VoiceStyle = 'default' | 'male';

export function speak(text: string, rate = 1, style: VoiceStyle = 'default'): Promise<void> {
  return speakTracked(text, rate, style).then(() => undefined);
}

export function speakOnce(text: string, rate = 1): Promise<'spoken' | 'failed'> {
  return speakTracked(text, rate, 'default');
}

/** Read phrase groups once, with a short silence between them and no labels. */
export async function speakChunks(
  chunks: readonly string[],
  gapMs = 400,
  isCancelled?: () => boolean,
): Promise<'spoken' | 'failed'> {
  for (let index = 0; index < chunks.length; index += 1) {
    if (isCancelled?.()) return 'failed';
    if (index > 0) await wait(gapMs);
    if (isCancelled?.()) return 'failed';
    const result = await speakOnce(chunks[index] ?? '', 1);
    if (result !== 'spoken') return 'failed';
  }
  return chunks.length > 0 ? 'spoken' : 'failed';
}

function speakTracked(text: string, rate = 1, style: VoiceStyle = 'default'): Promise<'spoken' | 'failed'> {
  return (async () => {
    const gap = 80 - (Date.now() - lastCancelAt);
    if (gap > 0) await wait(gap);
    const synth = window.speechSynthesis;
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    if (!synth) {
      await wait(Math.min(20000, 700 + words * 420));
      return 'failed';
    }
    await waitForVoices(style === 'male');
    return new Promise<'spoken' | 'failed'>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'en-US';
      utterance.rate = rate;
      utterance.volume = 1;
      utterance.pitch = 1;
      const voices = synth.getVoices();
      const voice =
        style === 'male' ? (pickMaleVoice(voices) ?? pickGoogleVoice(voices) ?? pickVoice(voices)) : pickVoice(voices);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }

      let settled = false;
      const keepAlive = window.setInterval(() => {
        if (synth.speaking) synth.resume();
      }, 4000);
      const finish = (status: 'spoken' | 'failed') => {
        if (settled) return;
        settled = true;
        window.clearTimeout(backup);
        window.clearInterval(keepAlive);
        pendingSpeeches.delete(cancelFinish);
        resolve(status);
      };
      const cancelFinish = () => finish('failed');
      pendingSpeeches.add(cancelFinish);
      utterance.onend = () => finish('spoken');
      utterance.onerror = () => finish('failed');
      const backup = window.setTimeout(() => finish('spoken'), Math.min(24000, 1400 + words * 520));
      try {
        synth.speak(utterance);
        synth.resume();
      } catch {
        finish('failed');
      }
    });
  })();
}

export function speakPassage(
  text: string,
  rate = 1,
  isCancelled?: () => boolean,
  style: VoiceStyle = 'default',
): Promise<void> {
  const parts = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)?.map((part) => part.trim()).filter(Boolean) ?? [];
  const chunks = parts.length > 0 ? parts : [text];
  let chain = speak(chunks[0] ?? text, rate, style);
  for (const part of chunks.slice(1)) {
    chain = chain.then(() => {
      if (isCancelled?.()) return undefined;
      return speak(part, rate, style);
    });
  }
  return chain;
}

let audioContext: AudioContext | null = null;

export function getAudioContext(): AudioContext {
  if (!audioContext) audioContext = new AudioContext();
  void audioContext.resume();
  return audioContext;
}

export function playBeep(): Promise<void> {
  const ctx = getAudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.18, ctx.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.22);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start();
  oscillator.stop(ctx.currentTime + 0.24);
  return wait(280);
}

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

let micStream: MediaStream | null = null;
let pendingMic: Promise<MediaStream | null> | null = null;

export async function requestMic(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('microphone-unavailable');
  }
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true },
  });
}

export function ensureMic(): Promise<MediaStream | null> {
  if (micStream?.getTracks().some((track) => track.readyState === 'live')) {
    return Promise.resolve(micStream);
  }
  if (pendingMic) return pendingMic;
  pendingMic = requestMic()
    .then((stream) => {
      micStream = stream;
      return stream;
    })
    .catch(() => {
      micStream = null;
      return null;
    })
    .finally(() => {
      pendingMic = null;
    });
  return pendingMic;
}

export function releaseMic(): void {
  micStream?.getTracks().forEach((track) => track.stop());
  micStream = null;
}

export function listenFor(ms: number, onText: (text: string) => void): () => void {
  const recognition = createRecognition();
  if (!recognition) return () => {};
  let stopped = false;
  recognition.onresult = (event) => onText(transcriptFrom(event));
  recognition.onend = () => {
    if (stopped) return;
    window.setTimeout(() => {
      if (stopped) return;
      try {
        active.start();
      } catch {
        // Already running.
      }
    }, 150);
  };
  const active = recognition;
  let timer = 0;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    window.clearTimeout(timer);
    active.onend = null;
    try {
      active.stop();
    } catch {
      // Already stopped.
    }
  };
  try {
    active.start();
  } catch {
    return () => {};
  }
  timer = window.setTimeout(stop, ms);
  return stop;
}
