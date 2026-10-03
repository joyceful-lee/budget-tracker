const KipCreature = (function () {
  const CARE = {
    feed: { stat: "hunger", boost: 22, speech: "That snack hit the spot!" },
    play: { stat: "joy", boost: 22, speech: "Let's tumble in the leaves!" },
    rest: { stat: "energy", boost: 24, speech: "A cozy nap fixes everything." },
    tidy: { stat: "tidy", boost: 22, speech: "Nest feels fresh again." }
  };
  const AGE_STAGES = ["baby", "teen", "adult", "elderly"];

  function stageForCare(count) {
    if (count >= 15) return "elderly";
    if (count >= 9) return "adult";
    if (count >= 4) return "teen";
    return "baby";
  }

  function recordMemory(data, stage) {
    data.memories = data.memories || {};
    const key = data.speciesId + ":" + stage;
    if (!data.memories[key]) {
      data.memories[key] = {
        speciesId: data.speciesId,
        stage: stage,
        petName: data.petName,
        unlockedAt: Date.now()
      };
    }
  }

  function clamp(n) {
    return Math.max(0, Math.min(100, Math.round(n)));
  }

  function tickDecay(data) {
    const now = Date.now();
    const last = data.creature.lastTick || now;
    const hours = Math.min(48, (now - last) / 3600000);
    if (hours < 0.15) return data;

    const health = KipFinance.healthScore(data);
    const rate = health >= 70 ? 2.2 : health >= 45 ? 3.4 : 5.2;
    const loss = hours * rate;

    data.creature.hunger = clamp(data.creature.hunger - loss);
    data.creature.joy = clamp(data.creature.joy - loss * 0.9);
    data.creature.energy = clamp(data.creature.energy - loss * 1.05);
    data.creature.tidy = clamp(data.creature.tidy - loss * 0.8);
    data.creature.lastTick = now;
    return data;
  }

  function maybeGrantVisitTokens(data) {
    if (!data.onboarded) return data;
    const today = new Date().toISOString().slice(0, 10);
    if (data.lastTokenDay === today) return data;
    const grant = KipFinance.tokenGrantFromHealth(KipFinance.healthScore(data));
    data.tokens = (data.tokens || 0) + grant;
    data.lastTokenDay = today;
    data.lastTokenGrant = grant;
    return data;
  }

  function sync() {
    return KipStorage.update(function (data) {
      tickDecay(data);
      maybeGrantVisitTokens(data);
    });
  }

  function qualityOfLife(data) {
    const c = data.creature;
    const base = (c.hunger + c.joy + c.energy + c.tidy) / 4;
    const bonus = KipStorage.cosmeticBonus(data);
    return Math.round(Math.min(100, base + bonus * 0.35));
  }

  function mood(data) {
    const qol = qualityOfLife(data);
    const health = KipFinance.healthScore(data);
    const blended = Math.round(qol * 0.65 + health * 0.35);
    if (blended >= 75) return "happy";
    if (blended >= 45) return "okay";
    return "sad";
  }

  function speechForState(data) {
    const name = data.petName || "Hi";
    const m = mood(data);
    const health = KipFinance.healthScore(data);
    const qol = qualityOfLife(data);
    const decor = KipStorage.cosmeticBonus(data);

    if (m === "happy") {
      if (decor > 0) return name + " loves the nest upgrades you bought!";
      return health >= 70
        ? name + " loves this sunny nest vibe!"
        : name + " feels wonderful thanks to your care!";
    }
    if (m === "okay") {
      if (qol < 55) return name + " could use care or a flower shop treat.";
      return name + " is doing alright. Keep the journal and care going.";
    }
    if (health < 35) return "The nest feels drafty. Check your Money Journal.";
    return name + " is a bit wilted. Feed, play, rest, or tidy.";
  }

  function care(action) {
    const config = CARE[action];
    if (!config) return { ok: false, message: "Unknown care action." };
    let result = { ok: false, message: "" };

    KipStorage.update(function (data) {
      tickDecay(data);
      if ((data.tokens || 0) < 1) {
        result = {
          ok: false,
          message: "You need a nest token. Improve your journal or finish a lesson."
        };
        return;
      }
      data.tokens -= 1;
      data.creature[config.stat] = clamp(data.creature[config.stat] + config.boost);
      if (action === "play") {
        data.creature.energy = clamp(data.creature.energy - 4);
        data.creature.joy = clamp(data.creature.joy + 4);
      }
      if (action === "rest") data.creature.hunger = clamp(data.creature.hunger - 3);
      data.creature.careCount = (data.creature.careCount || 0) + 1;
      const previousAge = data.creature.age || "baby";
      data.creature.age = stageForCare(data.creature.careCount);
      recordMemory(data, data.creature.age);
      data.creature.lastTick = Date.now();
      if (data.creature.age !== previousAge) {
        result = {
          ok: true,
          grew: true,
          message: data.petName + " grew into the " + data.creature.age + " stage! A memory was unlocked.",
          speech: "A new chapter!"
        };
      } else {
        result = { ok: true, message: config.speech, speech: config.speech };
      }

      if (data.creature.age === "elderly" && data.creature.careCount >= 18) {
        recordMemory(data, "elderly");
        data.retiredCreatures = data.retiredCreatures || [];
        data.retiredCreatures.push({
          id: KipStorage.uid(),
          speciesId: data.speciesId,
          petName: data.petName,
          retiredAt: Date.now()
        });
        data.lastRetiredSpecies = data.speciesId;
        data.onboarded = false;
        result = {
          ok: true,
          retired: true,
          message: data.petName + " retired into the Memory Box. A new mystery egg is ready!",
          speech: "Keep our memories safe."
        };
      }
    });
    return result;
  }

  function hatch(petName, eggId) {
    return KipStorage.update(function (data) {
      const speciesId = KipStorage.hatchSpecies(eggId, data);
      data.onboarded = true;
      data.petName = petName;
      data.eggId = eggId;
      data.speciesId = speciesId;
      data.tokens = 3;
      data.flowers = 8;
      data.mapUnlocks = ["start"];
      data.creature = {
        hunger: 80,
        joy: 80,
        energy: 80,
        tidy: 80,
        age: "baby",
        careCount: 0,
        lastTick: Date.now()
      };
      recordMemory(data, "baby");
    });
  }

  function completeLesson(lessonId, flowerBonus, mapRegion) {
    let firstClear = false;
    KipStorage.update(function (data) {
      if (data.lessonsCompleted.indexOf(lessonId) === -1) {
        data.lessonsCompleted.push(lessonId);
        data.tokens = (data.tokens || 0) + 2;
        data.flowers = (data.flowers || 0) + (flowerBonus || 4);
        firstClear = true;
        if (mapRegion && data.mapUnlocks.indexOf(mapRegion) === -1) {
          data.mapUnlocks.push(mapRegion);
        }
      }
    });
    return firstClear;
  }

  function buyCosmetic(itemId) {
    const item = KipStorage.getCosmetic(itemId);
    if (!item) return { ok: false, message: "Item not found." };
    let result = { ok: false, message: "" };
    KipStorage.update(function (data) {
      if ((data.ownedCosmetics || []).indexOf(itemId) !== -1) {
        result = { ok: false, message: "You already own that." };
        return;
      }
      if ((data.flowers || 0) < item.cost) {
        result = { ok: false, message: "Need " + item.cost + " flowers." };
        return;
      }
      data.flowers -= item.cost;
      data.ownedCosmetics = data.ownedCosmetics || [];
      data.ownedCosmetics.push(itemId);
      if (item.type === "nest") data.equippedNest = itemId;
      else data.equippedAccessory = itemId;
      data.creature.joy = clamp(data.creature.joy + item.joyBonus);
      result = {
        ok: true,
        message: "Bought " + item.name + "! " + data.petName + " looks happier."
      };
    });
    return result;
  }

  function equipCosmetic(itemId) {
    const item = KipStorage.getCosmetic(itemId);
    if (!item) return;
    KipStorage.update(function (data) {
      if ((data.ownedCosmetics || []).indexOf(itemId) === -1) return;
      if (item.type === "nest") data.equippedNest = itemId;
      else data.equippedAccessory = itemId;
    });
  }

  function accessoryMarkup(data) {
    const id = data.equippedAccessory;
    const color = (data.cosmeticColors && data.cosmeticColors[id]) ||
      (id === "acc-bow" ? "#e8a08a" : id === "acc-scarf" ? "#6aaa6e" : "#e8f6ff");
    if (id === "acc-bow") {
      return '<g class="pet-bow"><path d="M96 55 C86 42 71 45 74 58 C77 69 89 66 98 60 Z" fill="' + color + '" stroke="#8d5d57" stroke-width="2"></path>' +
        '<path d="M104 55 C114 42 129 45 126 58 C123 69 111 66 102 60 Z" fill="' + color + '" stroke="#8d5d57" stroke-width="2"></path>' +
        '<circle cx="100" cy="58" r="6" fill="' + color + '" stroke="#8d5d57" stroke-width="2"></circle></g>';
    }
    if (id === "acc-scarf") {
      return '<path d="M70 130 Q100 145 130 130 L125 155 Q100 148 75 155 Z" fill="' + color + '"></path>';
    }
    if (id === "acc-hat") {
      return '<path d="M72 50 Q100 26 128 50 L124 56 L76 56 Z" fill="' + color + '"></path><rect x="68" y="52" width="64" height="8" rx="4" fill="' + color + '"></rect>';
    }
    return "";
  }

  function bodyByShape(species) {
    const b = species.body;
    const belly = species.belly;
    const a = species.accent;
    const shape = species.shape;

    if (shape === "leafy") {
      return (
        '<path d="M100 52 C70 70 58 105 70 138 C82 162 118 162 130 138 C142 105 130 70 100 52 Z" fill="' + b + '"></path>' +
        '<ellipse cx="100" cy="120" rx="24" ry="28" fill="' + belly + '"></ellipse>' +
        '<path d="M100 40 C92 20 108 12 100 4 C108 12 118 28 100 40" fill="' + a + '"></path>' +
        '<path d="M55 88 C40 70 48 52 68 66" fill="' + a + '"></path>' +
        '<path d="M145 88 C160 70 152 52 132 66" fill="' + a + '"></path>'
      );
    }
    if (shape === "pod") {
      return (
        '<ellipse cx="100" cy="112" rx="40" ry="56" fill="' + b + '"></ellipse>' +
        '<ellipse cx="100" cy="120" rx="22" ry="34" fill="' + belly + '"></ellipse>' +
        '<path d="M100 58 L88 34 L100 42 L112 34 Z" fill="' + a + '"></path>' +
        '<ellipse cx="68" cy="96" rx="10" ry="18" fill="' + a + '"></ellipse>' +
        '<ellipse cx="132" cy="96" rx="10" ry="18" fill="' + a + '"></ellipse>'
      );
    }
    if (shape === "cloud") {
      return (
        '<ellipse cx="100" cy="118" rx="48" ry="40" fill="' + b + '"></ellipse>' +
        '<circle cx="70" cy="100" r="22" fill="' + b + '"></circle>' +
        '<circle cx="130" cy="100" r="22" fill="' + b + '"></circle>' +
        '<circle cx="100" cy="88" r="26" fill="' + b + '"></circle>' +
        '<ellipse cx="100" cy="124" rx="26" ry="20" fill="' + belly + '"></ellipse>' +
        '<path d="M60 150 Q55 170 48 178" fill="none" stroke="' + a + '" stroke-width="4" stroke-linecap="round"></path>' +
        '<path d="M140 150 Q145 170 152 178" fill="none" stroke="' + a + '" stroke-width="4" stroke-linecap="round"></path>'
      );
    }
    if (shape === "winged") {
      return (
        '<ellipse cx="58" cy="110" rx="22" ry="14" fill="' + a + '" opacity="0.85"></ellipse>' +
        '<ellipse cx="142" cy="110" rx="22" ry="14" fill="' + a + '" opacity="0.85"></ellipse>' +
        '<ellipse cx="100" cy="112" rx="46" ry="42" fill="' + b + '"></ellipse>' +
        '<ellipse cx="100" cy="122" rx="24" ry="22" fill="' + belly + '"></ellipse>' +
        '<circle cx="78" cy="72" r="10" fill="' + a + '"></circle>' +
        '<circle cx="122" cy="72" r="10" fill="' + a + '"></circle>'
      );
    }
    if (shape === "round-flame") {
      return (
        '<ellipse cx="100" cy="112" rx="50" ry="46" fill="' + b + '"></ellipse>' +
        '<ellipse cx="100" cy="124" rx="26" ry="22" fill="' + belly + '"></ellipse>' +
        '<path d="M100 58 L86 28 L100 40 L114 28 Z" fill="' + a + '"></path>' +
        '<path d="M70 70 L58 48 L74 58" fill="' + a + '"></path>' +
        '<path d="M130 70 L142 48 L126 58" fill="' + a + '"></path>'
      );
    }
    return (
      '<ellipse cx="100" cy="110" rx="52" ry="48" fill="' + b + '"></ellipse>' +
      '<ellipse cx="100" cy="122" rx="28" ry="24" fill="' + belly + '"></ellipse>' +
      '<ellipse cx="62" cy="72" rx="14" ry="18" transform="rotate(-18 62 72)" fill="' + a + '"></ellipse>' +
      '<ellipse cx="138" cy="72" rx="14" ry="18" transform="rotate(18 138 72)" fill="' + a + '"></ellipse>' +
      '<ellipse cx="100" cy="58" rx="10" ry="14" fill="' + a + '"></ellipse>'
    );
  }

  function petSvgMarkup(data, sizeClass) {
    const species = KipStorage.getSpecies(data.speciesId);
    const cls = sizeClass || "creature";
    return (
      '<svg class="' + cls + ' age-' + ((data.creature && data.creature.age) || "baby") + '" viewBox="0 0 200 200" aria-hidden="true">' +
        '<ellipse class="creature-shadow" cx="100" cy="168" rx="42" ry="10"></ellipse>' +
        bodyByShape(species) +
        '<circle class="creature-cheek" cx="72" cy="112" r="7"></circle>' +
        '<circle class="creature-cheek" cx="128" cy="112" r="7"></circle>' +
        '<ellipse class="creature-eye" cx="82" cy="100" rx="7" ry="9"></ellipse>' +
        '<ellipse class="creature-eye" cx="118" cy="100" rx="7" ry="9"></ellipse>' +
        '<circle class="creature-pupil" cx="83" cy="101" r="3.2"></circle>' +
        '<circle class="creature-pupil" cx="119" cy="101" r="3.2"></circle>' +
        '<path class="creature-mouth" d="M90 124 Q100 132 110 124" fill="none" stroke-width="3" stroke-linecap="round"></path>' +
        accessoryMarkup(data) +
      "</svg>"
    );
  }

  function bangsPath(bangs, hair) {
    if (bangs === "full") {
      return '<path d="M36 39 Q60 25 84 39 L82 54 Q77 48 72 56 Q66 48 60 56 Q54 48 48 56 Q42 48 38 53 Z" fill="' + hair + '"></path>';
    }
    if (bangs === "curtain") {
      return (
        '<path d="M34 39 Q47 26 59 34 Q56 49 47 58 Q42 48 36 51 Z" fill="' + hair + '"></path>' +
        '<path d="M86 39 Q73 26 61 34 Q64 49 73 58 Q78 48 84 51 Z" fill="' + hair + '"></path>'
      );
    }
    return '<path d="M34 39 Q55 25 84 39 Q69 40 55 58 Q49 50 37 53 Z" fill="' + hair + '"></path>';
  }

  function backHairPath(style, hair) {
    // Cap sits behind and over the crown so the top of the head is never bare.
    const crown =
      '<ellipse cx="60" cy="40" rx="30" ry="24" fill="' + hair + '"></ellipse>' +
      '<path d="M30 48 Q28 70 34 78 Q40 62 44 52" fill="' + hair + '"></path>' +
      '<path d="M90 48 Q92 70 86 78 Q80 62 76 52" fill="' + hair + '"></path>';

    if (style === "long") {
      return (
        crown +
        '<path d="M30 56 Q26 110 34 130 Q46 112 60 110 Q74 112 86 130 Q94 110 90 56 Z" fill="' + hair + '"></path>'
      );
    }
    if (style === "pony") {
      return (
        crown +
        '<path d="M78 48 Q104 62 98 108 Q90 84 80 68" fill="' + hair + '"></path>' +
        '<ellipse cx="96" cy="108" rx="10" ry="14" fill="' + hair + '"></ellipse>'
      );
    }
    if (style === "afro") {
      return (
        '<circle cx="40" cy="40" r="20" fill="' + hair + '"></circle>' +
        '<circle cx="60" cy="28" r="24" fill="' + hair + '"></circle>' +
        '<circle cx="80" cy="40" r="20" fill="' + hair + '"></circle>' +
        '<circle cx="48" cy="54" r="14" fill="' + hair + '"></circle>' +
        '<circle cx="72" cy="54" r="14" fill="' + hair + '"></circle>'
      );
    }
    return crown;
  }

  function avatarSvgMarkup(avatar, sizeClass, walking) {
    const a = Object.assign(KipStorage.defaultData().avatar, avatar || {});
    const walkClass = walking ? " is-walking" : "";
    return (
      '<svg class="' + (sizeClass || "avatar") + walkClass + '" style="--avatar-hair:' + a.hair + '" viewBox="0 0 120 180" aria-hidden="true">' +
        '<ellipse cx="60" cy="172" rx="24" ry="6" fill="rgba(31,51,41,0.22)"></ellipse>' +
        '<g class="avatar-leg avatar-limb left">' +
          '<rect x="43" y="116" width="13" height="34" rx="6" fill="' + a.pants + '"></rect>' +
          '<ellipse cx="50" cy="154" rx="9" ry="5" fill="#2a2a2a"></ellipse>' +
        "</g>" +
        '<g class="avatar-leg avatar-limb right">' +
          '<rect x="64" y="116" width="13" height="34" rx="6" fill="' + a.pants + '"></rect>' +
          '<ellipse cx="70" cy="154" rx="9" ry="5" fill="#2a2a2a"></ellipse>' +
        "</g>" +
        '<rect class="avatar-torso" x="38" y="76" width="44" height="46" rx="14" fill="' + a.shirt + '"></rect>' +
        '<g class="avatar-arm avatar-limb left">' +
          '<rect x="24" y="80" width="14" height="34" rx="7" fill="' + a.skin + '"></rect>' +
        "</g>" +
        '<g class="avatar-arm avatar-limb right">' +
          '<rect x="82" y="80" width="14" height="34" rx="7" fill="' + a.skin + '"></rect>' +
        "</g>" +
        '<g class="avatar-hair-back">' + backHairPath(a.backHair, a.hair) + "</g>" +
        '<circle class="avatar-head" cx="60" cy="56" r="24" fill="' + a.skin + '"></circle>' +
        '<g class="avatar-bangs">' + bangsPath(a.bangs, a.hair) + "</g>" +
        '<g class="avatar-face"><circle class="avatar-eye eye-left" cx="51" cy="56" r="2.8" fill="#1f3329"></circle>' +
        '<circle class="avatar-eye eye-right" cx="69" cy="56" r="2.8" fill="#1f3329"></circle>' +
        '<path d="M54 66 Q60 70 66 66" fill="none" stroke="#1f3329" stroke-width="2" stroke-linecap="round"></path></g>' +
      "</svg>"
    );
  }

  function applyBrand() {
    const data = KipStorage.load();
    if (!data.onboarded) return;
    const nest = KipStorage.brandName(data, "Nest");
    const world = KipStorage.brandName(data, "World");
    document.querySelectorAll("[data-brand='nest']").forEach(function (el) {
      el.textContent = nest;
    });
    document.querySelectorAll("[data-brand='world']").forEach(function (el) {
      el.textContent = world;
    });
    document.querySelectorAll("a.brand").forEach(function (el) {
      el.textContent = nest;
    });
    if (document.title.indexOf("World") !== -1) document.title = world;
    else if (document.title.indexOf("Journal") !== -1) document.title = "Money Journal · " + nest;
    else document.title = nest;
  }

  return {
    CARE,
    sync,
    care,
    mood,
    qualityOfLife,
    AGE_STAGES,
    speechForState,
    hatch,
    completeLesson,
    buyCosmetic,
    equipCosmetic,
    petSvgMarkup,
    avatarSvgMarkup,
    applyBrand
  };
})();
