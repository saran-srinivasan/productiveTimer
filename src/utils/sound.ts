// Web Audio API pure synthesizer for tactical audio feedback

let audioCtx: AudioContext | null = null;

const getAudioContext = (): AudioContext | null => {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
};

export const playTacticalSound = (
  type: "click" | "start" | "pause" | "complete" | "countdown_end" = "click",
  enabled = true,
): void => {
  if (!enabled) return;
  const ctx = getAudioContext();
  if (!ctx) return;

  try {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === "start") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.12);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "pause") {
      osc.type = "sine";
      osc.frequency.setValueAtTime(580, now);
      osc.frequency.exponentialRampToValueAtTime(290, now + 0.14);
      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
    } else if (type === "complete") {
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const chordOsc = ctx.createOscillator();
        const chordGain = ctx.createGain();
        chordOsc.type = "triangle";
        chordOsc.frequency.value = freq;
        chordOsc.connect(chordGain);
        chordGain.connect(ctx.destination);

        const startTime = now + idx * 0.08;
        chordGain.gain.setValueAtTime(0.1, startTime);
        chordGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        chordOsc.start(startTime);
        chordOsc.stop(startTime + 0.35);
      });
    } else if (type === "countdown_end") {
      [880, 880, 1174.66].forEach((freq, idx) => {
        const alertOsc = ctx.createOscillator();
        const alertGain = ctx.createGain();
        alertOsc.type = "square";
        alertOsc.frequency.value = freq;
        alertOsc.connect(alertGain);
        alertGain.connect(ctx.destination);

        const startTime = now + idx * 0.12;
        alertGain.gain.setValueAtTime(0.08, startTime);
        alertGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);
        alertOsc.start(startTime);
        alertOsc.stop(startTime + 0.1);
      });
    } else {
      osc.type = "triangle";
      osc.frequency.setValueAtTime(1200, now);
      osc.frequency.exponentialRampToValueAtTime(120, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.start(now);
      osc.stop(now + 0.04);
    }
  } catch {
    // Ignore audio context errors
  }
};
