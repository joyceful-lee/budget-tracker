const KipCreature = (function () {
  /** Every species has art for four ages; a goal pet uses the first three. */
  const AGE_STAGES = ["baby", "teen", "adult", "elderly"];
  const GOAL_STAGES = ["baby", "teen", "adult"];
  const HOUR_MS = 3600000;
  /** How long a pet can sit at zero fullness before it dies. */
  const STARVE_GRACE_HOURS = 24;

  const PLAY_LINES = [
    "Let's tumble in the leaves!",
    "Tag, you're it!",
    "Again, again!",
    "Watch me spin!"
  ];

  function stageForProgress(p) {
    if (p >= 1) return "adult";
    if (p >= 0.5) return "teen";
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
    return Math.max(0, Math.min(100, n));
  }

  function isComplete(data) {
    return !!data.creature.completedAt;
  }

  function die(data, reason, at) {
    const c = data.creature;
    c.alive = false;
    c.deathReason = reason;
    c.diedAt = at;
  }

  /** Advance hunger to now and apply starvation or a missed deadline. */
  function tick(data) {
    const c = data.creature;
    const now = Date.now();
    if (!data.onboarded || !data.goal || !c.alive || isComplete(data)) {
      c.lastTick = now;
      return data;
    }

    const last = c.lastTick || now;
    const perHour = 100 / KipFinance.hoursToEmpty(data, last);
    const before = c.fullness;
    c.fullness = clamp(before - perHour * (now - last) / HOUR_MS);
    if (c.fullness <= 0 && !c.starvingSince) {
      c.starvingSince = Math.round(last + (before / perHour) * HOUR_MS);
    }
    c.lastTick = now;

    const starvedAt = c.starvingSince ? c.starvingSince + STARVE_GRACE_HOURS * HOUR_MS : Infinity;
    const dueAt = KipFinance.deadlineEnd(data.goal);
    if (starvedAt <= now && starvedAt <= dueAt) die(data, "starved", starvedAt);
    else if (dueAt <= now) die(data, "deadline", dueAt);
    return data;
  }

  /** Evolve and complete based on saved progress. Pets never de-evolve. */
  function checkGrowth(data) {
    const result = { grew: false, completed: false };
    if (!data.creature.alive || isComplete(data)) return result;
    const p = KipFinance.progress(data);
    const target = stageForProgress(p);
    if (GOAL_STAGES.indexOf(target) > GOAL_STAGES.indexOf(data.creature.age)) {
      data.creature.age = target;
      recordMemory(data, target);
      result.grew = true;
    }
    if (p >= 1) {
      data.creature.completedAt = Date.now();
      data.creature.fullness = 100;
      data.creature.starvingSince = null;
      result.completed = true;
    }
    return result;
  }

  function sync() {
    return KipStorage.update(tick);
  }

  function hatch(petName, eggId, goal) {
    return KipStorage.update(function (data) {
      data.speciesId = KipStorage.hatchSpecies(eggId, data);
      data.onboarded = true;
      data.petName = petName;
      data.eggId = eggId;
      data.goal = goal;
      data.transactions = [];
      data.creature = KipStorage.defaultData().creature;
      recordMemory(data, "baby");
    });
  }

  /** Log money in or out. Money in also feeds the pet. A dead pet blocks logging until revived. */
  function logMoney(type, label, amount) {
    let result = { ok: false, fed: 0, grew: false, completed: false };
    KipStorage.update(function (data) {
      tick(data);
      if (!data.creature.alive) return;
      result.ok = true;
      data.transactions.push({
        id: KipStorage.uid(),
        type: type,
        label: label,
        amount: amount,
        date: KipFinance.todayIso()
      });
      const c = data.creature;
      if (type === "in" && !isComplete(data)) {
        const points = KipFinance.feedPoints(data, amount);
        c.fullness = clamp(c.fullness + points);
        c.starvingSince = null;
        result.fed = points;
      }
      Object.assign(result, checkGrowth(data));
    });
    return result;
  }

  function removeTransaction(id) {
    KipStorage.update(function (data) {
      if (!data.creature.alive) return;
      data.transactions = data.transactions.filter(function (t) { return t.id !== id; });
    });
  }

  function play() {
    return PLAY_LINES[Math.floor(Math.random() * PLAY_LINES.length)];
  }

  /** Bring a pet back. A missed deadline needs a new one. */
  function revive(newDeadline) {
    let result = { ok: false, grew: false, completed: false };
    KipStorage.update(function (data) {
      const c = data.creature;
      if (c.alive) return;
      if (KipFinance.daysLeft(data) <= 0) {
        if (!newDeadline || newDeadline <= KipFinance.todayIso()) return;
        data.goal.deadline = newDeadline;
      }
      c.alive = true;
      c.fullness = 60;
      c.starvingSince = null;
      c.diedAt = null;
      c.deathReason = "";
      c.revives = (c.revives || 0) + 1;
      c.lastTick = Date.now();
      result = Object.assign({ ok: true }, checkGrowth(data));
    });
    return result;
  }

  /** Move the current pet into the Memory Box so a new goal can begin. */
  function retire() {
    KipStorage.update(function (data) {
      if (!data.onboarded) return;
      data.pastPets.push({
        id: KipStorage.uid(),
        petName: data.petName,
        speciesId: data.speciesId,
        age: data.creature.age,
        goalLabel: data.goal ? data.goal.label : "",
        target: data.goal ? data.goal.target : 0,
        saved: KipFinance.saved(data),
        revives: data.creature.revives || 0,
        outcome: isComplete(data) ? "complete" : "released",
        endedAt: Date.now()
      });
      data.lastRetiredSpecies = data.speciesId;
      data.onboarded = false;
      data.goal = null;
      data.transactions = [];
    });
  }

  function mood(data) {
    const c = data.creature;
    if (!c.alive) return "dead";
    if (isComplete(data)) return "happy";
    if (c.fullness >= 60) return "happy";
    if (c.fullness >= 25) return "okay";
    return "hungry";
  }

  function speechForState(data) {
    const name = data.petName || "Your pet";
    const c = data.creature;
    if (!c.alive) {
      return c.deathReason === "deadline"
        ? name + " ran out of time before the goal was reached."
        : name + " went hungry for too long.";
    }
    if (isComplete(data)) return "We did it! " + data.goal.label + " is fully saved!";
    if (c.starvingSince) return "I'm starving! Log some money in, please!";
    const m = mood(data);
    if (m === "hungry") return "My tummy is rumbling... time to save a little?";
    if (m === "okay") return "I could go for a snack soon.";
    return "I'm full and cozy. Thanks for saving!";
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
    const age = (data.creature && data.creature.age) || "baby";
    return (
      '<svg class="' + cls + ' age-' + age + ' species-' + species.id + '" viewBox="0 0 200 200" aria-hidden="true">' +
        '<ellipse class="creature-shadow" cx="100" cy="168" rx="42" ry="10"></ellipse>' +
        fantasyBody(species, age) +
        fantasyFace(species, age) +
        restFace(species, age) +
      "</svg>"
    );
  }

  function fantasyBody(species, age) {
    const b = species.body, a = species.accent, belly = species.belly;
    const level = AGE_STAGES.indexOf(age);
    if (species.id === "air") {
      if (level === 0) {
        return '<ellipse cx="78" cy="118" rx="28" ry="24" fill="' + belly + '"></ellipse><ellipse cx="122" cy="118" rx="28" ry="24" fill="' + belly + '"></ellipse><ellipse cx="100" cy="104" rx="34" ry="30" fill="' + belly + '"></ellipse>';
      }
      if (level === 1) {
        return '<ellipse cx="62" cy="122" rx="32" ry="26" fill="' + belly + '"></ellipse><ellipse cx="138" cy="122" rx="32" ry="26" fill="' + belly + '"></ellipse><ellipse cx="100" cy="108" rx="48" ry="36" fill="' + belly + '"></ellipse><ellipse cx="86" cy="86" rx="22" ry="20" fill="' + belly + '"></ellipse><ellipse cx="118" cy="84" rx="24" ry="22" fill="' + belly + '"></ellipse>';
      }
      const tone = level === 3 ? "#b7c5d3" : belly;
      return '<ellipse cx="54" cy="124" rx="30" ry="28" fill="' + tone + '"></ellipse><ellipse cx="146" cy="124" rx="30" ry="28" fill="' + tone + '"></ellipse><ellipse cx="100" cy="112" rx="56" ry="40" fill="' + tone + '"></ellipse><ellipse cx="78" cy="78" rx="26" ry="24" fill="' + tone + '"></ellipse><ellipse cx="124" cy="76" rx="28" ry="26" fill="' + tone + '"></ellipse>' +
        (level === 3 ? '<path d="M70 148 L58 176 L78 158 L74 182 L98 150 M128 148 L118 174 L140 156" fill="none" stroke="#f4d64e" stroke-width="5" stroke-linejoin="round"></path>' : '');
    }
    if (species.id === "water") {
      if (level === 0) {
        return '<ellipse cx="100" cy="116" rx="43" ry="31" fill="' + b + '"></ellipse>';
      }
      const blush = '<defs><radialGradient id="waterBlushLeft' + level + '" fx="70%" fy="58%"><stop stop-color="#fff" stop-opacity=".92"></stop><stop offset="1" stop-color="#fff" stop-opacity="0"></stop></radialGradient><radialGradient id="waterBlushRight' + level + '" fx="30%" fy="58%"><stop stop-color="#fff" stop-opacity=".92"></stop><stop offset="1" stop-color="#fff" stop-opacity="0"></stop></radialGradient></defs>';
      const fins = '<path d="M66 104 C48 91 24 91 19 110 C23 132 48 145 72 124Z M134 104 C152 91 176 91 181 110 C177 132 152 145 128 124Z" fill="' + belly + '" opacity=".96"></path><path d="M54 106 Q39 108 31 118 M146 106 Q161 108 169 118" fill="none" stroke="#ffffff" stroke-opacity=".42" stroke-width="3" stroke-linecap="round"></path>';
      if (level === 1) {
        return blush + fins + '<circle cx="100" cy="115" r="46" fill="' + b + '"></circle><circle cx="70" cy="123" r="18" fill="url(#waterBlushLeft' + level + ')"></circle><circle cx="130" cy="123" r="18" fill="url(#waterBlushRight' + level + ')"></circle>';
      }
      const radius = level === 3 ? 57 : 52;
      return blush + fins + '<circle cx="100" cy="112" r="' + radius + '" fill="' + b + '"></circle><circle cx="64" cy="122" r="21" fill="url(#waterBlushLeft' + level + ')"></circle><circle cx="136" cy="122" r="21" fill="url(#waterBlushRight' + level + ')"></circle><path d="M91 143 Q100 150 109 143" fill="none" stroke="' + a + '" stroke-width="4" stroke-linecap="round"></path>';
    }
    if (species.id === "earth") {
      if (level === 0) {
        return '<path d="M62 138 C58 104 74 86 100 82 C128 86 146 104 140 138 C126 154 78 154 62 138Z" fill="#909691"></path><path d="M72 94 Q77 75 88 80 Q98 68 108 80 Q120 73 129 94 Q115 89 100 93 Q86 89 72 94Z" fill="' + a + '"></path>';
      }
      if (level === 1) {
        return '<path d="M61 111 Q39 101 35 119 Q37 140 61 133 M139 109 Q162 99 166 119 Q164 140 139 133 M78 145 Q70 162 87 169 M120 145 Q130 162 113 169" fill="none" stroke="#7a827c" stroke-width="13" stroke-linecap="round"></path><path d="M64 143 Q52 128 61 107 Q56 83 80 77 Q95 64 111 78 Q137 73 141 100 Q153 119 136 142 Q119 153 101 147 Q79 156 64 143Z" fill="#898f8a"></path><path d="M66 86 Q76 61 89 75 Q102 57 114 75 Q131 62 139 88 Q122 83 105 89 Q86 81 66 86Z" fill="' + a + '"></path>';
      }
      if (level === 2) {
        return '<path d="M56 98 Q30 80 22 105 Q18 132 47 138 M146 96 Q172 78 179 105 Q181 134 153 139 M75 145 Q58 166 82 177 M126 145 Q142 166 117 177" fill="none" stroke="#717973" stroke-width="17" stroke-linecap="round"></path><path d="M56 145 Q43 123 56 99 Q48 73 76 66 Q94 48 112 68 Q143 60 147 91 Q164 110 148 142 Q127 158 104 149 Q77 161 56 145Z" fill="#828983"></path><path d="M57 67 Q68 42 82 55 Q98 32 113 54 Q136 37 146 66 L140 78 Q121 68 103 77 Q79 67 60 80Z" fill="' + a + '"></path>';
      }
      return '<path d="M49 103 Q20 84 15 112 Q14 143 47 145 M151 102 Q181 82 186 113 Q185 144 151 146 M68 148 Q47 171 76 181 M133 148 Q154 171 124 181" fill="none" stroke="#656d67" stroke-width="20" stroke-linecap="round"></path><path d="M47 148 Q32 122 49 96 Q43 64 73 57 Q92 36 113 60 Q148 51 154 87 Q176 109 156 146 Q132 166 105 155 Q73 169 47 148Z" fill="#747b75"></path><path d="M49 58 Q61 31 78 46 Q96 22 114 44 Q141 27 153 58 L145 76 Q122 63 102 73 Q75 61 53 77Z" fill="' + a + '"></path><path d="M63 133 Q100 151 139 132 Q129 158 103 155 Q76 164 63 133Z" fill="#626963" opacity=".5"></path>';
    }
    if (species.id === "fire") {
      if (level === 0) {
        return '<path d="M100 42 C125 73 153 86 145 126 C137 165 62 166 54 126 C47 92 75 84 83 57 C89 69 96 60 100 42Z" fill="' + b + '"></path><path d="M101 83 C114 103 125 111 119 132 C113 150 84 150 79 131 C75 113 91 105 101 83Z" fill="' + belly + '"></path>';
      }
      if (level === 1) {
        return '<path d="M70 92 C66 74 80 66 89 53 C96 66 104 59 111 48 C117 61 130 67 134 92Z" fill="' + a + '"></path><path d="M62 108 C58 84 78 76 100 80 C124 76 144 88 140 116 C136 148 64 148 62 108Z" fill="' + b + '"></path><ellipse cx="76" cy="153" rx="10" ry="12" fill="' + b + '"></ellipse><ellipse cx="124" cy="153" rx="10" ry="12" fill="' + b + '"></ellipse>';
      }
      const body = '<path d="M64 96 C60 74 78 66 100 70 C124 66 142 78 138 104 C142 138 120 156 100 158 C78 156 58 136 64 96Z" fill="' + b + '"></path><path d="M70 118 Q48 124 46 150 M130 118 Q152 124 154 150 M80 150 Q74 170 86 176 M120 150 Q126 170 114 176" fill="none" stroke="' + b + '" stroke-width="13" stroke-linecap="round"></path>';
      if (level === 2) {
        return '<path d="M66 90 C57 70 72 59 82 43 C88 55 94 52 100 32 C106 49 113 49 120 36 C127 52 143 62 136 86 C117 75 86 76 66 90Z" fill="' + a + '"></path><path d="M78 82 C73 69 84 63 90 52 C96 63 99 60 102 45 C107 59 113 58 120 50 C126 64 131 71 124 82 Q101 73 78 82Z" fill="' + b + '"></path>' + body;
      }
      return '<path d="M64 91 C54 70 70 58 80 41 C87 54 92 51 98 25 C105 48 112 48 121 31 C126 48 147 59 137 87 C117 74 84 75 64 91Z" fill="' + a + '"></path><path d="M76 83 C70 67 83 59 90 46 C97 59 100 55 103 38 C109 56 116 54 123 44 C130 60 135 70 126 82 Q101 71 76 83Z" fill="' + b + '"></path>' + body;
    }
    if (species.id === "metal") {
      const teeth = '<path d="M100 46 V60 M100 140 V154 M46 100 H60 M140 100 H154 M62 62 L72 72 M138 62 L128 72 M62 138 L72 128 M138 138 L128 128" stroke="' + a + '" stroke-width="13" stroke-linecap="square"></path>';
      if (level === 0) return teeth + '<circle cx="100" cy="100" r="43" fill="' + b + '" stroke="' + a + '" stroke-width="5"></circle><circle cx="100" cy="100" r="18" fill="' + belly + '" stroke="' + a + '" stroke-width="5"></circle>';
      if (level === 1) return teeth + '<circle cx="100" cy="100" r="48" fill="' + b + '" stroke="' + a + '" stroke-width="5"></circle><rect x="74" y="78" width="52" height="43" rx="8" fill="' + belly + '"></rect><circle cx="100" cy="137" r="8" fill="' + a + '"></circle>';
      return '<g stroke="' + a + '" stroke-width="5"><rect x="49" y="55" width="102" height="99" rx="18" fill="' + b + '"></rect><rect x="70" y="73" width="60" height="47" rx="7" fill="' + belly + '"></rect><path d="M49 90 H29 V132 H49 M151 90 H171 V132 H151 M75 154 V176 M125 154 V176" fill="none" stroke-width="14" stroke-linecap="round"></path></g><circle cx="82" cy="136" r="8" fill="#e8a08a"></circle><circle cx="106" cy="136" r="8" fill="#77c7b7"></circle>' + (level === 2 ? '<path d="M127 39 V56 M119 39 H135" stroke="' + a + '" stroke-width="5"></path>' : '') + (level === 3 ? '<path d="M73 54 L54 29 L72 34 L75 13 M127 54 L148 30 L130 34 L128 12" fill="none" stroke="' + a + '" stroke-width="7" stroke-linecap="round"></path><circle cx="75" cy="11" r="6" fill="#f0c15a"></circle><circle cx="128" cy="10" r="6" fill="#77c7b7"></circle>' : '');
    }
    if (species.id === "fairy") {
      const antennaLevel = Math.max(0, level - 1);
      const antennaTop = level === 1 ? 48 : level === 2 ? 24 : 8;
      const bulbs = level === 3 ? '<g fill="#fff1a0" stroke="' + a + '" stroke-width="1.4" style="filter:drop-shadow(0 0 7px #fff3a3)"><circle cx="66" cy="5" r="4"></circle><circle cx="61" cy="10" r="4"></circle><circle cx="71" cy="10" r="4"></circle><circle cx="66" cy="15" r="4"></circle><circle cx="134" cy="5" r="4"></circle><circle cx="129" cy="10" r="4"></circle><circle cx="139" cy="10" r="4"></circle><circle cx="134" cy="15" r="4"></circle></g>' : '<g style="filter:drop-shadow(0 0 6px #fff3a3)"><circle cx="66" cy="' + (antennaTop - 3) + '" r="' + (5 + antennaLevel) + '" fill="#fff1a0" stroke="' + a + '" stroke-width="2"></circle><circle cx="134" cy="' + (antennaTop - 3) + '" r="' + (5 + antennaLevel) + '" fill="#fff1a0" stroke="' + a + '" stroke-width="2"></circle></g>';
      const antennae = level === 0 ? '' : '<path d="M84 91 Q78 ' + (antennaTop + 10) + ' 68 ' + antennaTop + ' M116 91 Q122 ' + (antennaTop + 10) + ' 132 ' + antennaTop + '" fill="none" stroke="' + a + '" stroke-width="3.5" stroke-linecap="round"></path>' + bulbs;
      if (level === 0) {
        return '<ellipse cx="53" cy="108" rx="32" ry="21" fill="' + belly + '" opacity=".9"></ellipse><ellipse cx="147" cy="108" rx="32" ry="21" fill="' + belly + '" opacity=".9"></ellipse><ellipse cx="100" cy="116" rx="40" ry="32" fill="' + b + '"></ellipse>' + antennae;
      }
      if (level === 1) {
        return '<path d="M60 104 Q28 78 36 134 Q54 146 74 118 M140 104 Q172 78 164 134 Q146 146 126 118" fill="' + belly + '" opacity=".92"></path><ellipse cx="100" cy="116" rx="40" ry="32" fill="' + b + '"></ellipse>' + antennae;
      }
      return '<path d="M56 100 Q22 70 30 140 Q52 156 78 120 M144 100 Q178 70 170 140 Q148 156 122 120" fill="' + belly + '" opacity=".9"></path><path d="M78 86 C84 68 116 68 122 86 C140 90 148 118 132 140 C118 162 82 162 68 140 C52 118 60 90 78 86Z" fill="' + b + '"></path>' + antennae;
    }
    if (species.id === "dark") {
      if (level === 0) {
        return '<path d="M48 146 C52 120 70 112 88 118 C96 104 110 104 118 118 C138 112 156 122 154 146 C130 156 70 156 48 146Z" fill="' + b + '"></path>';
      }
      if (level === 1) {
        return '<path d="M45 147 C42 126 55 114 70 116 C68 92 86 79 102 91 C113 69 139 79 137 105 C158 102 168 126 153 145 C141 158 124 148 111 158 C96 166 82 151 69 158 C58 161 47 156 45 147Z" fill="' + b + '"></path>';
      }
      const darkBody = level === 2
        ? '<path d="M37 143 C35 115 50 100 69 105 C63 75 84 64 104 83 C116 51 149 67 142 101 C169 94 178 124 158 146 C145 159 127 148 114 159 C98 169 80 151 65 160 C51 164 39 156 37 143Z" fill="' + b + '"></path>'
        : '<path d="M31 146 C27 112 48 92 68 103 C58 66 86 47 106 76 C123 39 158 60 146 101 C175 89 187 126 164 149 C146 164 127 148 112 163 C94 175 74 151 57 163 C42 167 33 158 31 146Z" fill="' + b + '"></path>';
      return darkBody + '<path d="M48 113 Q25 101 25 80 M153 111 Q178 101 180 78" fill="none" stroke="' + b + '" stroke-width="13" stroke-linecap="round"></path>' + (level === 3 ? '<circle cx="24" cy="77" r="9" fill="' + a + '"></circle><circle cx="181" cy="75" r="9" fill="' + a + '"></circle>' : '');
    }
    if (species.id === "money") {
      const shine = '<g fill="#fff9cf" style="filter:drop-shadow(0 0 4px #fff3a3)"><path d="M72 73 L75 81 L83 84 L75 87 L72 95 L69 87 L61 84 L69 81Z"></path><circle cx="128" cy="72" r="3"></circle></g>';
      if (level === 0) {
        return '<circle cx="100" cy="112" r="48" fill="' + b + '" stroke="' + a + '" stroke-width="8"></circle><circle cx="100" cy="112" r="34" fill="none" stroke="' + belly + '" stroke-width="4"></circle>' + shine;
      }
      if (level === 1) {
        return '<circle cx="100" cy="104" r="48" fill="' + b + '" stroke="' + a + '" stroke-width="8"></circle><circle cx="100" cy="104" r="34" fill="none" stroke="' + belly + '" stroke-width="4"></circle>' + shine + '<ellipse cx="78" cy="158" rx="15" ry="7" fill="#6b4f16"></ellipse><ellipse cx="122" cy="158" rx="15" ry="7" fill="#6b4f16"></ellipse>';
      }
      return '<path d="M78 143 V158 M122 143 V158" stroke="#6b4f16" stroke-width="11" stroke-linecap="round"></path><ellipse cx="76" cy="166" rx="16" ry="8" fill="#6b4f16"></ellipse><ellipse cx="124" cy="166" rx="16" ry="8" fill="#6b4f16"></ellipse><circle cx="100" cy="100" r="49" fill="' + b + '" stroke="' + a + '" stroke-width="8"></circle><circle cx="100" cy="100" r="35" fill="none" stroke="' + belly + '" stroke-width="4"></circle>' + shine;
    }
    if (species.id === "electric") {
      if (level === 0) {
        return '<path d="M108 36 L78 88 L98 88 L82 150 L128 80 L106 80Z" fill="' + b + '" stroke="' + a + '" stroke-width="5" stroke-linejoin="round"></path>';
      }
      const spread = level === 1 ? 48 : level === 2 ? 54 : 60;
      const legs = '<g fill="none" stroke="' + b + '" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"><path d="M72 99 L' + (100 - spread) + ' 82 L' + (92 - spread) + ' 67 M68 113 L' + (94 - spread) + ' 113 L' + (84 - spread) + ' 130 M74 127 L' + (104 - spread) + ' 143 L' + (98 - spread) + ' 159 M128 99 L' + (100 + spread) + ' 82 L' + (108 + spread) + ' 67 M132 113 L' + (106 + spread) + ' 113 L' + (116 + spread) + ' 130 M126 127 L' + (96 + spread) + ' 143 L' + (102 + spread) + ' 159"></path></g>';
      const horn = level === 1 ? '<path d="M92 79 L100 55 L108 79Z" fill="' + b + '"></path>' : level === 2 ? '<path d="M104 46 L91 66 L100 66 L94 86 L116 59 L106 59Z" fill="' + b + '" stroke-linejoin="round"></path>' : '<path d="M107 36 L88 65 L100 65 L91 91 L120 55 L107 55Z" fill="' + b + '" stroke-linejoin="round"></path>';
      const crabBody = level === 1
        ? '<path d="M63 105 C66 83 82 73 100 77 C118 73 134 83 137 105 C146 111 143 130 130 137 C115 147 85 147 70 137 C57 130 54 111 63 105Z" fill="' + b + '" stroke="' + a + '" stroke-width="4"></path>'
        : level === 2
          ? '<path d="M55 106 C61 80 80 69 100 75 C120 69 139 80 145 106 L158 115 L145 128 C135 149 65 149 55 128 L42 115Z" fill="' + b + '" stroke="' + a + '" stroke-width="4"></path><path d="M50 108 L31 99 L25 113 L42 124 M150 108 L169 99 L175 113 L158 124" fill="none" stroke="' + b + '" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"></path>'
          : '<path d="M47 108 C54 76 78 65 100 73 C123 65 147 76 153 108 L170 119 L153 134 C139 157 61 157 47 134 L30 119Z" fill="' + b + '" stroke="' + a + '" stroke-width="5"></path><path d="M43 105 L20 91 L11 109 L32 129 M157 105 L180 91 L189 109 L168 129" fill="none" stroke="' + b + '" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"></path><circle cx="61" cy="137" r="5" fill="#fff4a8" opacity=".8"></circle><circle cx="139" cy="137" r="5" fill="#fff4a8" opacity=".8"></circle>';
      return legs + crabBody + horn;
    }
    return bodyByShape(species);
  }

  function fantasyFace(species, age) {
    const level = AGE_STAGES.indexOf(age);
    if (species.id === "metal") {
      const eye = level === 0 ? '#f4fdff' : '#43515c';
      const stroke = level === 0 ? ' stroke="#2f3d48" stroke-width="2.5"' : '';
      return '<g class="creature-face"><rect x="76" y="86" width="14" height="10" rx="3" fill="' + eye + '"' + stroke + '></rect><rect x="110" y="86" width="14" height="10" rx="3" fill="' + eye + '"' + stroke + '></rect><path class="creature-mouth" d="M91 108 H109" fill="none" stroke="#43515c" stroke-width="4" stroke-linecap="round"></path></g>';
    }
    if (species.id === "money") {
      const y = level === 0 ? 105 : 94;
      if (level === 3) return '<g class="creature-face"><path d="M78 ' + y + ' Q86 ' + (y - 7) + ' 94 ' + y + ' M106 ' + y + ' Q114 ' + (y - 7) + ' 122 ' + y + '" fill="none" stroke="#6b4f16" stroke-width="3.5" stroke-linecap="round"></path><path class="creature-mouth" d="M91 ' + (y + 20) + ' Q100 ' + (y + 12) + ' 109 ' + (y + 20) + '" fill="none" stroke="#6b4f16" stroke-width="3"></path></g>';
      return '<g class="creature-face"><path d="M78 ' + y + ' Q86 ' + (y - 7) + ' 94 ' + y + ' M106 ' + y + ' Q114 ' + (y - 7) + ' 122 ' + y + '" fill="none" stroke="#6b4f16" stroke-width="3.5" stroke-linecap="round"></path><path class="creature-mouth" d="M92 ' + (y + 18) + ' Q100 ' + (y + 24) + ' 108 ' + (y + 18) + '" fill="none" stroke="#6b4f16" stroke-width="3"></path></g>';
    }
    if (species.id === "dark") {
      const y = level === 0 ? 128 : 112;
      return '<g class="creature-face"><circle cx="86" cy="' + y + '" r="4.5" fill="#f4eaff"></circle><circle cx="114" cy="' + y + '" r="4.5" fill="#f4eaff"></circle><path class="creature-mouth" d="M94 ' + (y + 14) + ' Q100 ' + (y + 18) + ' 106 ' + (y + 14) + '" fill="none" stroke="#f4eaff" stroke-width="2.5"></path></g>';
    }
    if (species.id === "earth") {
      return '<g class="creature-face"><path d="M78 104 L90 102 M110 102 L122 104" stroke="#294e32" stroke-width="4" stroke-linecap="round"></path><circle cx="84" cy="112" r="4" fill="#294e32"></circle><circle cx="116" cy="112" r="4" fill="#294e32"></circle><path class="creature-mouth" d="M92 128 Q100 133 108 128" fill="none" stroke="#294e32" stroke-width="3"></path></g>';
    }
    if (species.id === "fire" && level === 3) {
      return '<g class="creature-face"><path d="M78 104 L91 109 M109 109 L122 104" fill="none" stroke="#5d291d" stroke-width="4" stroke-linecap="round"></path><circle cx="87" cy="111" r="3.5" fill="#5d291d"></circle><circle cx="113" cy="111" r="3.5" fill="#5d291d"></circle><path class="creature-mouth" d="M89 124 Q100 135 111 124" fill="none" stroke="#5d291d" stroke-width="3"></path></g>';
    }
    if (species.id === "air") {
      if (level === 0) return '<g class="creature-face"><path d="M78 110 Q86 116 94 110 M106 110 Q114 116 122 110" fill="none" stroke="#486678" stroke-width="3.5" stroke-linecap="round"></path><ellipse class="creature-mouth" cx="100" cy="126" rx="5" ry="3.5" fill="#486678"></ellipse></g>';
      if (level === 1) return '<g class="creature-face"><circle cx="84" cy="111" r="4" fill="#486678"></circle><circle cx="116" cy="111" r="4" fill="#486678"></circle><path class="creature-mouth" d="M94 126 Q100 131 106 126" fill="none" stroke="#486678" stroke-width="3"></path></g>';
      if (level === 2) return '<g class="creature-face"><path d="M76 107 Q85 101 94 108 M106 108 Q115 101 124 107" fill="none" stroke="#3d596d" stroke-width="4" stroke-linecap="round"></path><path class="creature-mouth" d="M91 126 Q100 135 109 126" fill="none" stroke="#3d596d" stroke-width="3.5"></path></g>';
      return '<g class="creature-face"><path d="M76 112 Q85 105 94 112 M106 112 Q115 105 124 112" fill="none" stroke="#3d596d" stroke-width="4" stroke-linecap="round"></path><path class="creature-mouth" d="M91 132 Q100 124 109 132" fill="none" stroke="#3d596d" stroke-width="3.5"></path></g>';
    }
    if (species.id === "electric") {
      if (level === 0) {
        return '<g class="creature-face"><circle cx="94" cy="91" r="4" fill="#5b4810"></circle><circle cx="106" cy="91" r="4" fill="#5b4810"></circle><path class="creature-mouth" d="M95 102 Q100 106 105 102" fill="none" stroke="#5b4810" stroke-width="2.8"></path></g>';
      }
      return '<g class="creature-face"><circle cx="90" cy="106" r="4" fill="#5b4810"></circle><circle cx="110" cy="106" r="4" fill="#5b4810"></circle><path class="creature-mouth" d="M96 118 Q100 122 104 118" fill="none" stroke="#5b4810" stroke-width="2.8"></path></g>';
    }
    return '<g class="creature-face"><ellipse cx="84" cy="106" rx="4.5" ry="5.5" fill="#263b34"></ellipse><ellipse cx="116" cy="106" rx="4.5" ry="5.5" fill="#263b34"></ellipse><circle cx="83" cy="104" r="1.4" fill="#fff"></circle><circle cx="115" cy="104" r="1.4" fill="#fff"></circle><path class="creature-mouth" d="M94 122 Q100 126 106 122" fill="none" stroke="#263b34" stroke-width="2.6" stroke-linecap="round"></path></g>';
  }

  function restFace(species, age) {
    const level = AGE_STAGES.indexOf(age);
    const y = species.id === "dark" && level === 0 ? 128 : species.id === "electric" && level === 0 ? 92 : species.id === "money" ? 103 : 108;
    const ink = species.id === "dark" ? "#f4eaff" : species.id === "money" ? "#6b4f16" : "#35483f";
    return '<g class="rest-face"><path d="M78 ' + y + ' Q86 ' + (y + 7) + ' 94 ' + y + ' M106 ' + y + ' Q114 ' + (y + 7) + ' 122 ' + y + '" fill="none" stroke="' + ink + '" stroke-width="3.5" stroke-linecap="round"></path><path d="M94 ' + (y + 17) + ' Q100 ' + (y + 13) + ' 106 ' + (y + 17) + '" fill="none" stroke="' + ink + '" stroke-width="2.8" stroke-linecap="round"></path><text x="129" y="' + (y - 11) + '" fill="' + ink + '" font-size="14" font-family="sans-serif">z</text><text x="140" y="' + (y - 23) + '" fill="' + ink + '" font-size="18" font-family="sans-serif">z</text></g>';
  }

  function applyBrand() {
    const data = KipStorage.load();
    if (!data.onboarded) return;
    const nest = KipStorage.brandName(data, "Nest");
    document.querySelectorAll("[data-brand='nest']").forEach(function (el) {
      el.textContent = nest;
    });
    document.title = nest;
  }

  return {
    AGE_STAGES,
    GOAL_STAGES,
    STARVE_GRACE_HOURS,
    sync,
    hatch,
    logMoney,
    removeTransaction,
    play,
    revive,
    retire,
    isComplete,
    mood,
    speechForState,
    petSvgMarkup,
    applyBrand
  };
})();
