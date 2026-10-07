const KipStorage = (function () {
  const KEY = "kips-nest-data-v5";

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
  const LEGACY_KEY = "kips-nest-data-v4";

  function defaultCreature() {
    return {
      age: "baby",
      fullness: 100,
      lastTick: Date.now(),
      starvingSince: null,
      alive: true,
      diedAt: null,
      deathReason: "",
      revives: 0,
      completedAt: null
    };
  }

  function defaultData() {
    return {
      pets: [],
      memories: {},
      pastPets: [],
      lastRetiredSpecies: ""
    };
  }

  function normalizePet(pet) {
    return Object.assign({ transactions: [], device: null }, pet, {
      creature: Object.assign(defaultCreature(), pet.creature || {}),
      transactions: Array.isArray(pet.transactions) ? pet.transactions : []
    });
  }

  /** Bring a single-pet save from before Budgies into the multi-pet format. */
  function migrateLegacy() {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return null;
    try {
      const old = JSON.parse(raw);
      const data = defaultData();
      data.memories = old.memories || {};
      data.pastPets = Array.isArray(old.pastPets) ? old.pastPets : [];
      data.lastRetiredSpecies = old.lastRetiredSpecies || "";
      if (old.onboarded && old.goal) {
        data.pets.push({
          id: uid(),
          petName: old.petName,
          speciesId: old.speciesId,
          goal: old.goal,
          transactions: old.transactions || [],
          creature: old.creature,
          device: null,
          createdAt: old.goal.createdAt || Date.now()
        });
      }
      return data;
    } catch (err) {
      return null;
    }
  }

  function load() {
    let parsed = null;
    try {
      const raw = localStorage.getItem(KEY);
      parsed = raw ? JSON.parse(raw) : migrateLegacy();
    } catch (err) {
      parsed = null;
    }
    const data = Object.assign(defaultData(), parsed || {});
    data.pets = (Array.isArray(data.pets) ? data.pets : []).map(normalizePet);
    data.pastPets = Array.isArray(data.pastPets) ? data.pastPets : [];
    data.memories = Object.assign({}, data.memories || {});
    // Pets from older saves get a device the first time they load.
    let assigned = false;
    data.pets.forEach(function (pet) {
      if (!pet.device && typeof KipDevice !== "undefined") {
        pet.device = KipDevice.randomDevice();
        assigned = true;
      }
    });
    if (!parsed || assigned) save(data);
    return data;
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

  function findPet(data, id) {
    return data.pets.find(function (p) { return p.id === id; }) || null;
  }

  /** Run a mutation against one pet. Returns that pet after saving, or null if it doesn't exist. */
  function updatePet(id, mutator) {
    let found = null;
    update(function (data) {
      const pet = findPet(data, id);
      if (!pet) return;
      mutator(pet, data);
      found = pet;
    });
    return found;
  }

  function uid() {
    return "id-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 8);
  }

  function getSpecies(id) {
    return SPECIES[id] || SPECIES.air;
  }

  function hatchSpecies(data) {
    function roll() {
      // The secret Coinling has a small independent chance to appear.
      return Math.random() < 0.055 ? "money" : HATCH_POOL[Math.floor(Math.random() * HATCH_POOL.length)];
    }
    const taken = (data.pets || []).map(function (p) { return p.speciesId; });
    if (data.lastRetiredSpecies) taken.push(data.lastRetiredSpecies);
    let result = roll();
    // A species that is already active, or just retired, gets one automatic re-roll.
    if (taken.indexOf(result) !== -1) result = roll();
    return result;
  }

  return {
    KEY,
    LEGACY_KEY,
    SPECIES,
    load,
    save,
    update,
    updatePet,
    findPet,
    uid,
    defaultData,
    defaultCreature,
    getSpecies,
    hatchSpecies
  };
})();

document.querySelectorAll("[data-reset-game]").forEach(function (button) {
  button.addEventListener("click", function () {
    if (!window.confirm("Reset all progress and start over?")) return;
    localStorage.removeItem(KipStorage.KEY);
    localStorage.removeItem(KipStorage.LEGACY_KEY);
    window.location.href = "index.html";
  });
});
