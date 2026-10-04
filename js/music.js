(function () {
  const toggle = document.getElementById("music-toggle");
  if (!toggle) return;

  let context = null;
  let timer = null;
  let phrase = 0;
  let enabled = false;

  const scales = {
    happy: [261.63, 329.63, 392, 523.25, 392, 329.63],
    calm: [246.94, 293.66, 369.99, 440, 369.99, 293.66],
    tender: [220, 261.63, 329.63, 392, 329.63, 261.63]
  };

  function creatureMood() {
    const data = KipStorage.load();
    const c = data.creature || {};
    const happiness = ([c.hunger, c.joy, c.energy, c.tidy].reduce(function (sum, n) {
      return sum + (Number(n) || 0);
    }, 0)) / 4;
    if (happiness >= 70) return { name: "happy", tempo: 760, wave: "sine" };
    if (happiness >= 40) return { name: "calm", tempo: 980, wave: "triangle" };
    return { name: "tender", tempo: 1220, wave: "sine" };
  }

  function note(frequency, start, duration, wave, volume) {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = wave;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  function playPhrase() {
    if (!enabled || !context) return;
    const mood = creatureMood();
    const scale = scales[mood.name];
    const now = context.currentTime + 0.03;
    const root = scale[phrase % scale.length];
    note(root, now, 0.58, mood.wave, 0.035);
    note(root / 2, now, 0.85, "sine", 0.018);
    note(scale[(phrase + 2) % scale.length], now + 0.32, 0.55, mood.wave, 0.025);
    phrase += 1;
    window.clearTimeout(timer);
    timer = window.setTimeout(playPhrase, mood.tempo);
  }

  function updateButton() {
    toggle.setAttribute("aria-pressed", enabled ? "true" : "false");
    toggle.textContent = enabled ? "♪ Music on" : "♪ Music off";
    toggle.title = enabled
      ? "Music is adapting to your creature's happiness"
      : "Turn the adaptive background music on";
  }

  toggle.addEventListener("click", function () {
    enabled = !enabled;
    if (enabled) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        enabled = false;
        toggle.textContent = "Music unavailable";
        return;
      }
      if (!context) context = new AudioContextClass();
      context.resume();
      playPhrase();
    } else {
      window.clearTimeout(timer);
      if (context) context.suspend();
    }
    updateButton();
  });

  updateButton();
})();
