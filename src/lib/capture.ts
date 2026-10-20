import type { EndReason } from '../types';
import {
  createRecognition,
  getAudioContext,
  recognitionSupported,
  transcriptFrom,
} from './speech';

export type CaptureTick = {
  remainingMs: number;
  startRemainingMs: number;
  started: boolean;
  interim: string;
};

export type CaptureResult = {
  transcript: string;
  noResponse: boolean;
  hadSignal: boolean;
  end: EndReason;
  latencyMs: number | null;
  speakingMs: number;
  elapsedMs: number;
  audioBlob: Blob | null;
  recognitionAvailable: boolean;
  recognitionBlocked: boolean;
};

const RESPONSE_MS = 15_000;
const START_LIMIT_MS = 6_000;

export async function captureResponse(options: {
  stream: MediaStream | null;
  isCancelled: () => boolean;
  onTick: (tick: CaptureTick) => void;
  manualStop: { current: (() => void) | null };
}): Promise<CaptureResult | null> {
  const { stream, isCancelled, onTick, manualStop } = options;
  const recognitionAvailable = recognitionSupported();
  const startedAt = performance.now();
  let settled = false;
  let speechStarted = false;
  let firstSpeechAt = startedAt;
  let lastActivity = startedAt;
  let latestTranscript = '';
  let recognitionBlocked = false;
  let hotFrames = 0;

  const chunks: Blob[] = [];
  let recorder: MediaRecorder | null = null;
  if (stream) {
    try {
      const mimeType = pickMime();
      const options: MediaRecorderOptions = { audioBitsPerSecond: 32_000 };
      if (mimeType) options.mimeType = mimeType;
      recorder = new MediaRecorder(stream, options);
      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.push(event.data);
      };
      recorder.start();
    } catch {
      recorder = null;
    }
  }

  let analyser: AnalyserNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;
  if (stream) {
    const ctx = getAudioContext();
    void ctx.resume();
    source = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    source.connect(analyser);
  }
  const samples = analyser ? new Uint8Array(analyser.fftSize) : null;

  const recognition = stream && recognitionAvailable ? createRecognition() : null;
  let stopRecognition = false;
  if (recognition) {
    recognition.onresult = (event) => {
      latestTranscript = transcriptFrom(event);
      markSpeech(performance.now());
    };
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed' || event.error === 'audio-capture') {
        recognitionBlocked = true;
        stopRecognition = true;
      }
    };
    recognition.onend = () => {
      if (stopRecognition || settled) return;
      window.setTimeout(() => {
        if (stopRecognition || settled) return;
        try {
          recognition.start();
        } catch {
          // start() throws if called while already starting.
        }
      }, 180);
    };
    try {
      recognition.start();
    } catch {
      recognitionBlocked = true;
    }
  }

  function markSpeech(now: number) {
    if (!speechStarted) {
      speechStarted = true;
      firstSpeechAt = now;
    }
    lastActivity = now;
  }

  function rms(): number {
    if (!analyser || !samples) return 0;
    analyser.getByteTimeDomainData(samples);
    let sum = 0;
    for (const value of samples) {
      const centered = (value - 128) / 128;
      sum += centered * centered;
    }
    return Math.sqrt(sum / samples.length);
  }

  return new Promise((resolve) => {
    let timer = 0;

    const finish = (reason: EndReason) => {
      if (settled) return;
      settled = true;
      window.clearInterval(timer);
      stopRecognition = true;
      if (isCancelled()) {
        try {
          recognition?.abort();
        } catch {
          // Already stopped.
        }
        try {
          if (recorder && recorder.state !== 'inactive') recorder.stop();
        } catch {
          // Already stopped.
        }
        cleanup();
        resolve(null);
        return;
      }
      const end: EndReason = reason === 'manual' && !speechStarted ? 'no-response' : reason;
      const elapsedMs = Math.round(performance.now() - startedAt);
      const latencyMs = speechStarted ? Math.max(0, Math.round(firstSpeechAt - startedAt)) : null;
      const speakingMs = speechStarted ? Math.max(0, Math.round(lastActivity - firstSpeechAt)) : 0;
      stopRecognition = true;
      window.clearInterval(timer);
      try {
        recognition?.stop();
      } catch {
        // Already stopped.
      }
      const delay = end === 'no-response' ? 0 : 320;
      window.setTimeout(() => {
        cleanup();
        const transcript = end === 'no-response' ? '' : latestTranscript;
        const result: CaptureResult = {
          transcript,
          noResponse: end === 'no-response',
          hadSignal: speechStarted,
          end,
          latencyMs,
          speakingMs,
          elapsedMs,
          audioBlob: null,
          recognitionAvailable,
          recognitionBlocked,
        };
        if (!recorder || recorder.state === 'inactive') {
          resolve(result);
          return;
        }
        recorder.onstop = () => {
          const blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' });
          resolve({ ...result, audioBlob: blob.size > 0 ? blob : null });
        };
        try {
          recorder.stop();
        } catch {
          resolve(result);
        }
      }, delay);
    };

    function cleanup() {
      manualStop.current = null;
      source?.disconnect();
      if (recognition) recognition.onend = null;
    }

    manualStop.current = () => finish('manual');

    timer = window.setInterval(() => {
      if (settled) return;
      if (isCancelled()) {
        finish('manual');
        return;
      }
      const now = performance.now();
      const elapsed = now - startedAt;
      if (analyser && elapsed > 180) {
        const level = rms();
        if (level >= 0.03) {
          hotFrames += 1;
          if (hotFrames >= 2) markSpeech(now);
        } else {
          hotFrames = 0;
          if (speechStarted && level >= 0.02) lastActivity = now;
        }
      }
      onTick({
        remainingMs: Math.max(0, RESPONSE_MS - elapsed),
        startRemainingMs: Math.max(0, START_LIMIT_MS - elapsed),
        started: speechStarted,
        interim: latestTranscript,
      });
      const quietFor = now - lastActivity;
      const silenceNeed = latestTranscript.trim() ? 1500 : 2200;
      if (!speechStarted && elapsed >= START_LIMIT_MS) finish('no-response');
      else if (speechStarted && quietFor >= silenceNeed && now - firstSpeechAt >= 500) finish('silence');
      else if (elapsed >= RESPONSE_MS) finish('timeout');
    }, 100);
  });
}

function pickMime(): string {
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') return '';
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
  return types.find((type) => MediaRecorder.isTypeSupported(type)) ?? '';
}
