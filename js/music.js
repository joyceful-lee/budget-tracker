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
    // On a pet's page the music follows that pet; in the gallery it follows the first Budgie.
    const data = KipStorage.load();
    const id = new URLSearchParams(window.location.search).get("id");
    const pet = (id && KipStorage.findPet(data, id)) || data.pets[0];
    const mood = pet ? KipCreature.mood(pet) : "okay";
    if (mood === "happy") return { name: "happy", tempo: 760, wave: "sine" };
    if (mood === "okay") return { name: "calm", tempo: 980, wave: "triangle" };
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
    toggle.innerHTML = '<span class="icon" aria-hidden="true">' + (enabled ? "music_note" : "music_off") + "</span>" + (enabled ? "Music On" : "Music Off");
    toggle.title = enabled
      ? "Turn the background music off"
      : "Turn the background music on";
  }

  toggle.addEventListener("click", function () {
    enabled = !enabled;
    if (enabled) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) {
        enabled = false;
        toggle.textContent = "Music Unavailable";
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
