// Âm thanh sinh bằng WebAudio (không dùng file ngoài, nên không có vấn đề bản quyền). Nhạc nền đêm + hiệu ứng.
export function createAudio(settings) {
  let ac = null;
  let master = null;
  let musicTimer = null;
  let step = 0;

  function ensure() {
    if (ac) {
      if (ac.state === "suspended") ac.resume();
      return true;
    }
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return false;
    ac = new C();
    master = ac.createGain();
    master.gain.value = settings.volume;
    master.connect(ac.destination);
    return true;
  }

  function tone(freq, dur = 0.3, type = "sine", vol = 0.15, delay = 0, slideTo = null) {
    if (!ensure()) return;
    const t0 = ac.currentTime + delay;
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  const SFX = {
    pickup: (n = 0) => tone(880 + n * 70, 0.12, "sine", 0.12),
    deposit: () => tone(520, 0.2, "triangle", 0.14),
    light: () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.7, "sine", 0.16, i * 0.11)),
    pulse: () => (tone(330, 0.5, "sine", 0.18, 0, 700), tone(660, 0.4, "triangle", 0.08, 0.05)),
    hit: () => (tone(140, 0.35, "sawtooth", 0.16, 0, 60), tone(90, 0.4, "square", 0.08)),
    jump: () => tone(300, 0.18, "square", 0.07, 0, 620),
    dash: () => tone(900, 0.18, "sawtooth", 0.06, 0, 200),
    win: () => [523, 659, 784, 1046, 1318].forEach((f, i) => tone(f, 0.9, "sine", 0.15, i * 0.14)),
    lose: () => [392, 330, 262, 196].forEach((f, i) => tone(f, 0.8, "triangle", 0.15, i * 0.2)),
    spawn: () => tone(120, 0.6, "sine", 0.12, 0, 60),
    countdown: () => tone(1000, 0.08, "square", 0.08),
    charm: () => [700, 900, 1200].forEach((f, i) => tone(f, 0.25, "triangle", 0.12, i * 0.07)),
    steal: () => tone(600, 0.3, "sawtooth", 0.1, 0, 200),
    ui: () => tone(660, 0.07, "triangle", 0.08),
  };

  // Nhạc nền: nốt ngũ cung nhẹ nhàng lặp lại, đệm trầm.
  const SCALE = [220, 261.63, 293.66, 329.63, 392, 440, 523.25];
  const PATTERN = [0, 2, 4, 2, 1, 3, 5, 3, 0, 4, 2, 5, 1, 3, 2, 0];
  function musicTick() {
    const n = PATTERN[step % PATTERN.length];
    tone(SCALE[n], 1.2, "sine", 0.045);
    if (step % 4 === 0) tone(SCALE[n] / 2, 2.4, "triangle", 0.05);
    step++;
  }

  return {
    unlock: ensure,
    sfx: (name, arg) => SFX[name]?.(arg),
    startMusic() {
      if (!ensure() || musicTimer) return;
      musicTick();
      musicTimer = setInterval(musicTick, 600);
    },
    stopMusic() {
      clearInterval(musicTimer);
      musicTimer = null;
    },
    setVolume(v) {
      settings.volume = v;
      if (master) master.gain.value = v;
    },
  };
}
