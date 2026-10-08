const KipCreature = (function () {
  /** The ages a pet grows through as its goal fills. */
  const GOAL_STAGES = ["baby", "teen", "adult"];
  const HOUR_MS = 3600000;
  /** How long a pet can sit at zero fullness before it dies. */
  const STARVE_GRACE_HOURS = 24;
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

  /** Advance hunger to now and apply starvation or a missed deadline. */
  function tick(pet) {
    const c = pet.creature;
    const now = Date.now();
    if (!pet.goal || !c.alive || isComplete(pet)) {
      c.lastTick = now;
      return pet;
    }

    const last = c.lastTick || now;
    const perHour = 100 / KipFinance.hoursToEmpty(pet, last);
    const before = c.fullness;
    c.fullness = clamp(before - perHour * (now - last) / HOUR_MS);
    if (c.fullness <= 0 && !c.starvingSince) {
      c.starvingSince = Math.round(last + (before / perHour) * HOUR_MS);
    }
    c.lastTick = now;

    const starvedAt = c.starvingSince ? c.starvingSince + STARVE_GRACE_HOURS * HOUR_MS : Infinity;
    const dueAt = KipFinance.deadlineEnd(pet.goal);
    if (starvedAt <= now && starvedAt <= dueAt) die(pet, "starved", starvedAt);
    else if (dueAt <= now) die(pet, "deadline", dueAt);
    return pet;
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

  /** Log money in or out. Money in also feeds the pet. A dead pet blocks logging until revived. */
  function logMoney(id, type, label, amount) {
    let result = { ok: false, fed: 0, grew: false, completed: false };
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
        const points = KipFinance.feedPoints(pet, amount);
        c.fullness = clamp(c.fullness + points);
        c.starvingSince = null;
        result.fed = points;
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

  /** Bring a pet back. A missed deadline needs a new one. */
  function revive(id, newDeadline) {
    let result = { ok: false, grew: false, completed: false };
    KipStorage.updatePet(id, function (pet, data) {
      const c = pet.creature;
      if (c.alive) return;
      if (KipFinance.daysLeft(pet) <= 0) {
        if (!newDeadline || newDeadline <= KipFinance.todayIso()) return;
        pet.goal.deadline = newDeadline;
      }
      c.alive = true;
      c.fullness = 60;
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

  /** One line on how full the pet is or what it needs, shared by the gallery and the pet page. */
  function statusLine(pet) {
    const c = pet.creature;
    if (!c.alive) return pet.petName + " has passed away.";
    if (isComplete(pet)) return pet.petName + " reached the goal.";
    const toFill = KipFinance.formatMoney(KipFinance.amountToFill(pet, c.fullness));
    if (c.starvingSince) {
      const hoursLeft = Math.ceil(Math.max(0, STARVE_GRACE_HOURS - (Date.now() - c.starvingSince) / HOUR_MS));
      return "Log " + toFill + " within " + hoursLeft + (hoursLeft === 1 ? " hour" : " hours") + " to keep " + pet.petName + " alive.";
    }
    if (c.fullness >= FULL_THRESHOLD) {
      const hours = Math.ceil((c.fullness - FULL_THRESHOLD) / 100 * KipFinance.hoursToEmpty(pet));
      return "Full for " + hours + (hours === 1 ? " more hour" : " more hours");
    }
    return "Log " + toFill + " to feed " + pet.petName + ".";
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
    STARVE_GRACE_HOURS,
    sync,
    hatch,
    logMoney,
    removeTransaction,
    revive,
    retire,
    isComplete,
    mood,
    statusLine,
    petMarkup,
    eggMarkup
  };
})();
