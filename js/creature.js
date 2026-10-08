const KipCreature = (function () {
  /** The ages a pet grows through as its goal fills. */
  const GOAL_STAGES = ["baby", "teen", "adult"];
  const HOUR_MS = 3600000;
  /** A full belly empties in this many hours. */
  const HOURS_TO_EMPTY = 24;
  /** A pet at zero fullness loses one heart per day, and dies when the last one is gone. */
  const HEARTS = 4;
  const HOURS_PER_HEART = 24;
  /** Reviving a pet that missed its deadline pushes the deadline back this many days. */
  const DEADLINE_EXTENSION_DAYS = 7;
  /** A goal this many days or fewer from its deadline gets a warning on the gallery. */
  const DUE_SOON_DAYS = 3;
  /** Fullness at or above this counts as full, matching the happy mood. */
  const FULL_THRESHOLD = 60;


  function stageForProgress(p) {
    if (p >= 1) return "adult";
    if (p >= 0.5) return "teen";
    return "baby";
  }

  function recordMemory(data, pet, stage) {
    const key = pet.speciesId + ":" + stage;
    if (!data.memories[key]) {
      data.memories[key] = {
        speciesId: pet.speciesId,
        stage: stage,
        petName: pet.petName,
        unlockedAt: Date.now()
      };
    }
  }

  function clamp(n) {
    return Math.max(0, Math.min(100, n));
  }

  function isComplete(pet) {
    return !!pet.creature.completedAt;
  }

  function die(pet, reason, at) {
    const c = pet.creature;
    c.alive = false;
    c.deathReason = reason;
    c.diedAt = at;
  }

  /** Advance hunger to now and apply starvation or a missed deadline, whichever came first. */
  function tick(pet) {
    const c = pet.creature;
    const now = Date.now();
    if (!pet.goal || !c.alive || isComplete(pet)) {
      c.lastTick = now;
      return pet;
    }

    const last = c.lastTick || now;
    const perHour = 100 / HOURS_TO_EMPTY;
    const before = c.fullness;
    c.fullness = clamp(before - perHour * (now - last) / HOUR_MS);
    if (c.fullness <= 0 && !c.starvingSince) {
      c.starvingSince = Math.round(last + (before / perHour) * HOUR_MS);
    }
    c.lastTick = now;

    const starvedAt = c.starvingSince ? c.starvingSince + HEARTS * HOURS_PER_HEART * HOUR_MS : Infinity;
    const dueAt = KipFinance.deadlineEnd(pet.goal);
    if (starvedAt <= now && starvedAt <= dueAt) die(pet, "starved", starvedAt);
    else if (dueAt <= now) die(pet, "deadline", dueAt);
    return pet;
  }

  /** Hearts left: all of them until the belly is empty, then one fewer for each full day spent hungry. */
  function hearts(pet) {
    const c = pet.creature;
    if (!c.alive) return 0;
    if (!c.starvingSince) return HEARTS;
    return Math.max(0, HEARTS - Math.floor((Date.now() - c.starvingSince) / (HOURS_PER_HEART * HOUR_MS)));
  }

  /** Hours until a starving pet loses its next heart. */
  function hoursToNextHeart(pet) {
    const hungryHours = (Date.now() - pet.creature.starvingSince) / HOUR_MS;
    return Math.max(1, Math.ceil(HOURS_PER_HEART - hungryHours % HOURS_PER_HEART));
  }

  /** Evolve and complete based on saved progress. Pets never de-evolve. */
  function checkGrowth(pet, data) {
    const result = { grew: false, completed: false };
    if (!pet.creature.alive || isComplete(pet)) return result;
    const p = KipFinance.progress(pet);
    const target = stageForProgress(p);
    if (GOAL_STAGES.indexOf(target) > GOAL_STAGES.indexOf(pet.creature.age)) {
      pet.creature.age = target;
      recordMemory(data, pet, target);
      result.grew = true;
    }
    if (p >= 1) {
      pet.creature.completedAt = Date.now();
      pet.creature.fullness = 100;
      pet.creature.starvingSince = null;
      result.completed = true;
    }
    return result;
  }

  /** Tick every pet up to now and return the saved data. */
  function sync() {
    return KipStorage.update(function (data) {
      data.pets.forEach(tick);
    });
  }

  /** Create a new pet inside the chosen device. Returns the new pet's id. */
  function hatch(petName, device, goal) {
    let id = "";
    KipStorage.update(function (data) {
      const pet = {
        id: KipStorage.uid(),
        petName: petName,
        speciesId: KipStorage.hatchSpecies(data),
        goal: goal,
        transactions: [],
        device: device,
        creature: KipStorage.defaultCreature(),
        createdAt: Date.now()
      };
      data.pets.push(pet);
      recordMemory(data, pet, "baby");
      id = pet.id;
    });
    return id;
  }

  /** Log money in or out. Any money in fills the pet back up. A dead pet blocks logging until revived. */
  function logMoney(id, type, label, amount) {
    let result = { ok: false, fed: false, grew: false, completed: false };
    KipStorage.updatePet(id, function (pet, data) {
      tick(pet);
      if (!pet.creature.alive) return;
      result.ok = true;
      pet.transactions.push({
        id: KipStorage.uid(),
        type: type,
        label: label,
        amount: amount,
        date: KipFinance.todayIso()
      });
      const c = pet.creature;
      if (type === "in" && !isComplete(pet)) {
        c.fullness = 100;
        c.starvingSince = null;
        result.fed = true;
      }
      Object.assign(result, checkGrowth(pet, data));
    });
    return result;
  }

  function removeTransaction(id, transactionId) {
    KipStorage.updatePet(id, function (pet) {
      if (!pet.creature.alive) return;
      pet.transactions = pet.transactions.filter(function (t) { return t.id !== transactionId; });
    });
  }

  /**
   * Bring a pet back. The revive count stays with the pet. A passed deadline moves a week
   * past today, or past the old deadline if that is later, so the pet doesn't die again at once.
   */
  function revive(id) {
    let result = { ok: false, grew: false, completed: false };
    KipStorage.updatePet(id, function (pet, data) {
      const c = pet.creature;
      if (c.alive) return;
      if (KipFinance.daysLeft(pet) <= 0) pet.goal.deadline = extendedDeadline(pet);
      c.alive = true;
      c.fullness = 100;
      c.starvingSince = null;
      c.diedAt = null;
      c.deathReason = "";
      c.revives = (c.revives || 0) + 1;
      c.lastTick = Date.now();
      result = Object.assign({ ok: true }, checkGrowth(pet, data));
    });
    return result;
  }

  /** Move a pet into the Memory Box and remove it from the active Budgies. */
  function retire(id) {
    KipStorage.update(function (data) {
      const pet = KipStorage.findPet(data, id);
      if (!pet) return;
      data.pastPets.push({
        id: pet.id,
        petName: pet.petName,
        speciesId: pet.speciesId,
        age: pet.creature.age,
        device: pet.device,
        goalLabel: pet.goal ? pet.goal.label : "",
        target: pet.goal ? pet.goal.target : 0,
        saved: KipFinance.saved(pet),
        revives: pet.creature.revives || 0,
        outcome: isComplete(pet) ? "complete" : "released",
        endedAt: Date.now()
      });
      data.lastRetiredSpecies = pet.speciesId;
      data.pets = data.pets.filter(function (p) { return p.id !== id; });
    });
  }

  function mood(pet) {
    const c = pet.creature;
    if (!c.alive) return "dead";
    if (isComplete(pet)) return "happy";
    if (c.fullness >= FULL_THRESHOLD) return "happy";
    if (c.fullness >= 25) return "okay";
    return "hungry";
  }

  /** The deadline a revive would set for a pet whose deadline has passed. */
  function extendedDeadline(pet) {
    const today = KipFinance.todayIso();
    const from = pet.goal.deadline > today ? pet.goal.deadline : today;
    return KipFinance.addDaysIso(from, DEADLINE_EXTENSION_DAYS);
  }

  /**
   * The warning a gallery card shows, or null when the pet is fine. Starving and a close
   * deadline can both end in the pet passing away, so they outrank plain hunger.
   */
  function alertFor(pet) {
    const c = pet.creature;
    if (!c.alive || isComplete(pet)) return null;
    if (c.starvingSince) {
      return { level: "danger", icon: "heart_broken", text: "Starving" };
    }
    const days = Math.round((new Date(pet.goal.deadline + "T12:00:00") - new Date(KipFinance.todayIso() + "T12:00:00")) / KipFinance.DAY_MS);
    if (days <= DUE_SOON_DAYS) {
      const when = days <= 0 ? "today" : days === 1 ? "tomorrow" : "in " + days + " days";
      return { level: "danger", icon: "event_busy", text: "Goal due " + when };
    }
    if (mood(pet) === "hungry") return { level: "hungry", icon: "restaurant", text: "Hungry" };
    return null;
  }

  /** One line on how full the pet is or what it needs, shared by the gallery and the pet page. */
  function statusLine(pet) {
    const c = pet.creature;
    if (!c.alive) return pet.petName + " has passed away.";
    if (isComplete(pet)) return pet.petName + " reached the goal.";
    if (c.starvingSince) {
      const hours = hoursToNextHeart(pet);
      const within = "Save money within " + hours + (hours === 1 ? " hour" : " hours");
      return hearts(pet) === 1
        ? within + " to keep " + pet.petName + " alive."
        : within + " before " + pet.petName + " loses a heart.";
    }
    if (c.fullness >= FULL_THRESHOLD) {
      const hours = Math.ceil((c.fullness - FULL_THRESHOLD) / 100 * HOURS_TO_EMPTY);
      return "Full for " + hours + (hours === 1 ? " more hour" : " more hours");
    }
    return "Save money to feed " + pet.petName + ".";
  }

  /*
   * Pets are pixel sprites. Each PNG in assets/sprites is a sheet of two 64px frames,
   * awake then resting face, built by tools/build-sprites.mjs. Both frames are stacked
   * so CSS can swap to the resting face when a pet dies.
   */
  const SPRITE_DIR = "assets/sprites/";
  const SPRITE_SHADOW = pixelShadow(32, 53.76, 13.44, 3.2);

  /** A pixel-stepped ground shadow in the sprite's 64px grid. */
  function pixelShadow(cx, cy, rx, ry) {
    let d = "";
    for (let y = Math.ceil(cy - ry); y < cy + ry; y++) {
      const t = (y + 0.5 - cy) / ry;
      if (Math.abs(t) >= 1) continue;
      const half = rx * Math.sqrt(1 - t * t);
      const x0 = Math.round(cx - half), x1 = Math.round(cx + half);
      if (x1 > x0) d += "M" + x0 + " " + y + "h" + (x1 - x0) + "v1h" + (x0 - x1) + "z";
    }
    return '<svg viewBox="0 0 64 64" shape-rendering="crispEdges"><path class="creature-shadow" d="' + d + '"></path></svg>';
  }

  function petMarkup(data, sizeClass) {
    const species = KipStorage.getSpecies(data.speciesId);
    const cls = sizeClass || "creature";
    let age = (data.creature && data.creature.age) || "baby";
    if (GOAL_STAGES.indexOf(age) < 0) age = "baby";
    return spriteMarkup(cls + " age-" + age + " species-" + species.id, species.id + "-" + age);
  }

  /** The unhatched egg, on the same grid as the pets. Its resting frame is the cracked shell. */
  function eggMarkup(state) {
    return spriteMarkup("creature lcd-egg-sprite" + (state ? " is-" + state : ""), "egg");
  }

  function spriteMarkup(cls, name) {
    const src = SPRITE_DIR + name + ".png";
    return (
      '<span class="' + cls + '" aria-hidden="true">' +
        SPRITE_SHADOW +
        '<img class="creature-face" src="' + src + '" alt="">' +
        '<img class="rest-face" src="' + src + '" alt="">' +
      "</span>"
    );
  }

  return {
    GOAL_STAGES,
    HOURS_TO_EMPTY,
    HEARTS,
    extendedDeadline,
    sync,
    hatch,
    logMoney,
    removeTransaction,
    revive,
    retire,
    isComplete,
    mood,
    alertFor,
    hearts,
    statusLine,
    petMarkup,
    eggMarkup
  };
})();
