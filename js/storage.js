const KipStorage = (function () {
  const KEY = "kips-nest-data-v4";

  const SPECIES = {
    air: {
      id: "air",
      element: "Air",
      label: "Gustling",
      body: "#f0c15a",
      belly: "#fff3c8",
      accent: "#e3ad3f",
      shape: "winged"
    },
    fire: {
      id: "fire",
      element: "Fire",
      label: "Emberpup",
      body: "#f0a04b",
      belly: "#ffe0b5",
      accent: "#d97706",
      shape: "round-flame"
    },
    earth: {
      id: "earth",
      element: "Earth",
      label: "Mossback",
      body: "#7fb089",
      belly: "#e8f6df",
      accent: "#3f7a45",
      shape: "leafy"
    },
    water: {
      id: "water",
      element: "Water",
      label: "Ripplefin",
      body: "#62a9d6",
      belly: "#e1f5ff",
      accent: "#347fae",
      shape: "cloud"
    },
    metal: {
      id: "metal",
      element: "Metal",
      label: "Tinbit",
      body: "#9da9b3",
      belly: "#eef2f5",
      accent: "#596773",
      shape: "pod"
    },
    electric: {
      id: "electric",
      element: "Electric",
      label: "Zapple",
      body: "#f4d64e",
      belly: "#fff8c9",
      accent: "#c79210",
      shape: "round-flame"
    },
    dark: {
      id: "dark",
      element: "Dark",
      label: "Dusklet",
      body: "#645d80",
      belly: "#cfc9e3",
      accent: "#39334e",
      shape: "round"
    },
    fairy: {
      id: "fairy",
      element: "Fairy",
      label: "Glimmerbud",
      body: "#eaa8cf",
      belly: "#fff0f8",
      accent: "#b85f95",
      shape: "leafy"
    },
    money: {
      id: "money",
      element: "Money",
      label: "Coinling",
      hidden: true,
      body: "#e7b73c",
      belly: "#fff1ad",
      accent: "#8f6810",
      shape: "pod"
    },
    bean: {
      id: "bean",
      element: "Legacy",
      label: "Beanling",
      body: "#6aaa6e",
      belly: "#dff5e2",
      accent: "#2f6b3a",
      shape: "pod"
    },
    drizzle: {
      id: "drizzle",
      element: "Legacy",
      label: "Drizzle",
      egg: "sky",
      body: "#7eb6d9",
      belly: "#e8f6ff",
      accent: "#4a8fb5",
      shape: "cloud"
    },
    puff: {
      id: "puff",
      element: "Legacy",
      label: "Pufflet",
      egg: "sky",
      body: "#a8c8e8",
      belly: "#f2f8ff",
      accent: "#6b9bc4",
      shape: "winged"
    }
  };

  const HATCH_POOL = ["air", "water", "fire", "earth", "metal", "electric", "dark", "fairy"];
  const EGGS = [
    { id: "mystery-a", label: "Mystery egg", shell: "#f2e7c9", speck: "#b99d70", pool: HATCH_POOL },
    { id: "mystery-b", label: "Mystery egg", shell: "#f2e7c9", speck: "#b99d70", pool: HATCH_POOL },
    { id: "mystery-c", label: "Mystery egg", shell: "#f2e7c9", speck: "#b99d70", pool: HATCH_POOL }
  ];

  function defaultData() {
    return {
      onboarded: false,
      petName: "",
      eggId: "",
      speciesId: "",
      goal: null,
      transactions: [],
      memories: {},
      pastPets: [],
      lastRetiredSpecies: "",
      creature: {
        age: "baby",
        fullness: 100,
        lastTick: Date.now(),
        starvingSince: null,
        alive: true,
        diedAt: null,
        deathReason: "",
        revives: 0,
        completedAt: null
      }
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) {
        const fresh = defaultData();
        save(fresh);
        return fresh;
      }
      const parsed = JSON.parse(raw);
      return Object.assign(defaultData(), parsed, {
        creature: Object.assign(defaultData().creature, parsed.creature || {}),
        memories: Object.assign({}, parsed.memories || {}),
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        pastPets: Array.isArray(parsed.pastPets) ? parsed.pastPets : []
      });
    } catch (err) {
      const fresh = defaultData();
      save(fresh);
      return fresh;
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function update(mutator) {
    const data = load();
    mutator(data);
    save(data);
    return data;
  }

  function uid() {
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function getSpecies(id) {
    return SPECIES[id] || SPECIES.air;
  }

  function getEgg(id) {
    return EGGS.find(function (e) { return e.id === id; }) || EGGS[0];
  }

  function hatchSpecies(eggId, data) {
    const egg = getEgg(eggId);
    const pool = egg.pool || HATCH_POOL;
    // The secret Coinling has a small independent chance to appear.
    let result = Math.random() < 0.055 ? "money" : pool[Math.floor(Math.random() * pool.length)];
    // A duplicate of the creature that just retired gets one automatic re-hatch.
    if (data && data.lastRetiredSpecies && result === data.lastRetiredSpecies) {
      result = Math.random() < 0.055 ? "money" : pool[Math.floor(Math.random() * pool.length)];
    }
    return result;
  }

  function brandName(data, suffix) {
    const name = (data && data.petName) ? data.petName : "Nest";
    return name + "'s " + suffix;
  }

  return {
    KEY,
    SPECIES,
    EGGS,
    load,
    save,
    update,
    uid,
    defaultData,
    getSpecies,
    getEgg,
    hatchSpecies,
    brandName
  };
})();

document.querySelectorAll("[data-reset-game]").forEach(function (button) {
  button.addEventListener("click", function () {
    if (!window.confirm("Reset all progress and start over?")) return;
    localStorage.removeItem(KipStorage.KEY);
    window.location.href = "index.html";
  });
});
