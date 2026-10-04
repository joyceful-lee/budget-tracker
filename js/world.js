(function () {
  const viewport = document.getElementById("map-viewport");
  const map = document.getElementById("world-map");
  const playerEl = document.getElementById("map-player");
  const petEl = document.getElementById("map-pet");
  const statusEl = document.getElementById("world-status");
  const flowerCount = document.getElementById("flower-count");
  const avatarPreview = document.getElementById("avatar-preview");
  const activityModal = document.getElementById("activity-modal");
  const activityTitle = document.getElementById("activity-title");
  const activityIntro = document.getElementById("activity-intro");
  const activityBody = document.getElementById("activity-body");
  const activityFeedback = document.getElementById("activity-feedback");
  const lessonProgress = document.getElementById("lesson-progress");
  const btnCheck = document.getElementById("activity-check");
  const btnNext = document.getElementById("activity-next");
  const btnFinish = document.getElementById("activity-finish");
  const btnAction = document.getElementById("activity-action");
  const btnClose = document.getElementById("activity-close");
  const minimapPlayer = document.getElementById("minimap-player");
  const lookToggle = document.getElementById("look-toggle");
  const lookPanel = document.getElementById("look-panel");
  const mapFrame = document.getElementById("map-frame");
  const overviewToggle = document.getElementById("map-overview-toggle");

  const data0 = KipStorage.load();
  if (!data0.onboarded) {
    document.getElementById("gate-modal").hidden = false;
    return;
  }

  KipCreature.applyBrand();

  const MAP_W = 1800;
  const MAP_H = 1300;
  const SPEED = 2.4;
  const INTERACT_R = 90;

  // Soft water blockers; bridges punch walkable holes through the creek.
  const WATER_ZONES = [
    { x: 1190, y: 0, w: 610, h: 245 },
    { x: 1040, y: 135, w: 260, h: 150 },
    { x: 860, y: 150, w: 280, h: 180 },
    { x: 900, y: 250, w: 140, h: 120 },
    { x: 780, y: 360, w: 120, h: 160 },
    { x: 680, y: 500, w: 120, h: 160 },
    { x: 560, y: 640, w: 130, h: 160 },
    { x: 430, y: 780, w: 140, h: 160 },
    { x: 320, y: 920, w: 140, h: 180 },
    { x: 220, y: 1080, w: 150, h: 200 }
  ];
  const BRIDGE_ZONES = [
    { x: 365, y: 775, w: 255, h: 135 }
  ];
  function inRect(x, y, r) {
    return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
  }

  function onBridge(x, y) {
    return BRIDGE_ZONES.some(function (z) { return inRect(x, y, z); });
  }

  function inWater(x, y) {
    if (onBridge(x, y)) return false;
    return WATER_ZONES.some(function (z) { return inRect(x, y, z); });
  }

  function canStand(x, y) {
    if (x < 40 || x > MAP_W - 40 || y < 60 || y > MAP_H - 40) return false;
    if (inWater(x, y)) return false;
    return true;
  }

  const player = { x: 520, y: 520, facing: 1, direction: "down", moving: false };
  const pet = { x: 480, y: 540 };
  const keys = { up: false, down: false, left: false, right: false };
  let nearestSpot = null;
  let activeLesson = null;
  let stepIndex = 0;
  let lessonState = {};
  let activityMode = null;
  let actorsReady = false;
  let overviewMode = false;

  const SPOTS = {
    grove: { lesson: "needs-wants", x: 220, y: 280 },
    brook: { lesson: "budget-basics", x: 800, y: 300 },
    hill: { lesson: "saving-goals", x: 1560, y: 580 },
    bridge: { lesson: "upcoming-bills", x: 480, y: 840 },
    clearing: { lesson: "smart-choices", x: 1140, y: 1040 },
    shop: { activity: "shop", x: 1040, y: 500, unlock: "shop" },
    bank: { activity: "bank", x: 1420, y: 920, unlock: "bank" },
    planner: { activity: "planner", x: 300, y: 620, unlock: "planner" },
    gift: { activity: "gift", x: 600, y: 420, unlock: "gift" }
  };

  function refreshHud() {
    const data = KipStorage.load();
    flowerCount.textContent = data.flowers || 0;
    const u = KipStorage.unlocks(data);

    toggleLock("shop", u.shop);
    toggleLock("bank", u.bank);
    toggleLock("planner", u.planner);
    toggleLock("gift", u.gift);

    document.querySelectorAll(".weed").forEach(function (weed) {
      weed.hidden = !u.weeds || weed.dataset.pulled === "1";
    });

    document.querySelectorAll("[data-fog]").forEach(function (fog) {
      const region = fog.getAttribute("data-fog");
      const unlocked =
        (data.mapUnlocks || []).indexOf(region) !== -1 ||
        KipStorage.hasLesson(data, regionLesson(region));
      fog.classList.toggle("is-clear", unlocked);
    });

    playerEl.innerHTML = KipCreature.avatarSvgMarkup(data.avatar, "avatar world-avatar", false);
    petEl.innerHTML = KipCreature.petSvgMarkup(data, "creature world-pet");
    avatarPreview.innerHTML = KipCreature.avatarSvgMarkup(data.avatar, "avatar");
    actorsReady = true;
    syncWalkVisual();

    document.getElementById("avatar-skin").value = data.avatar.skin;
    document.getElementById("avatar-hair").value = data.avatar.hair;
    document.getElementById("avatar-bangs").value = data.avatar.bangs || "side";
    document.getElementById("avatar-back").value = data.avatar.backHair || "short";
    document.getElementById("avatar-shirt").value = data.avatar.shirt;
    document.getElementById("avatar-pants").value = data.avatar.pants || "#3d5648";
  }

  function syncWalkVisual() {
    playerEl.classList.toggle("is-moving", player.moving);
    ["up", "up-right", "right", "down-right", "down", "down-left", "left", "up-left"].forEach(function (dir) {
      playerEl.classList.toggle("dir-" + dir, player.direction === dir);
    });
    const svg = playerEl.querySelector("svg");
    if (svg) svg.classList.toggle("is-walking", player.moving);
  }

  function avatarFromControls() {
    return {
      skin: document.getElementById("avatar-skin").value,
      hair: document.getElementById("avatar-hair").value,
      shirt: document.getElementById("avatar-shirt").value,
      pants: document.getElementById("avatar-pants").value,
      bangs: document.getElementById("avatar-bangs").value,
      backHair: document.getElementById("avatar-back").value
    };
  }

  function renderAvatarPreview() {
    avatarPreview.innerHTML = KipCreature.avatarSvgMarkup(avatarFromControls(), "avatar");
  }

  ["avatar-skin", "avatar-shirt", "avatar-pants", "avatar-hair", "avatar-back", "avatar-bangs"].forEach(function (id) {
    document.getElementById(id).addEventListener("change", renderAvatarPreview);
  });

  lookToggle.addEventListener("click", function () {
    const open = lookPanel.hidden;
    lookPanel.hidden = !open;
    lookToggle.setAttribute("aria-expanded", open ? "true" : "false");
    lookToggle.querySelector("span").textContent = open ? "Close" : "Open";
  });

  overviewToggle.addEventListener("click", function () {
    overviewMode = !overviewMode;
    mapFrame.classList.toggle("is-overview", overviewMode);
    overviewToggle.setAttribute("aria-pressed", overviewMode ? "true" : "false");
    overviewToggle.textContent = overviewMode ? "Return to walking view" : "Show full map overview";
    updateCamera();
  });

  function regionLesson(region) {
    return {
      grove: "needs-wants",
      brook: "budget-basics",
      hill: "saving-goals",
      bridge: "upcoming-bills",
      clearing: "smart-choices"
    }[region];
  }

  function toggleLock(id, unlocked) {
    const lock = document.getElementById(id + "-lock");
    const spot = document.getElementById("spot-" + id);
    if (!lock || !spot) return;
    lock.hidden = unlocked;
    spot.classList.toggle("is-unlocked", unlocked);
  }

  document.getElementById("save-look").addEventListener("click", function () {
    KipStorage.update(function (data) {
      data.avatar = avatarFromControls();
    });
    refreshHud();
    statusEl.textContent = "Look saved.";
  });

  function placeActors() {
    const px = Math.round(player.x);
    const py = Math.round(player.y);
    const pex = Math.round(pet.x);
    const pey = Math.round(pet.y);
    playerEl.style.left = px + "px";
    playerEl.style.top = py + "px";
    petEl.style.left = pex + "px";
    petEl.style.top = pey + "px";
    minimapPlayer.style.left = (px / MAP_W * 100) + "%";
    minimapPlayer.style.top = (py / MAP_H * 100) + "%";
  }

  let cameraZoom = 1;
  function updateCamera() {
    const vw = viewport.clientWidth;
    const vh = viewport.clientHeight;
    if (overviewMode) {
      const overviewZoom = Math.min(vw / MAP_W, vh / MAP_H);
      const offsetX = Math.round((vw - MAP_W * overviewZoom) / 2);
      const offsetY = Math.round((vh - MAP_H * overviewZoom) / 2);
      map.style.transform = "translate3d(" + offsetX + "px," + offsetY + "px,0) scale(" + overviewZoom + ")";
      return;
    }
    cameraZoom = 1;
    let camX = Math.round(player.x) * cameraZoom - vw / 2;
    let camY = Math.round(player.y) * cameraZoom - vh / 2;
    const maxX = MAP_W * cameraZoom - vw;
    const maxY = MAP_H * cameraZoom - vh;
    camX = Math.round(Math.max(0, Math.min(maxX, camX)));
    camY = Math.round(Math.max(0, Math.min(maxY, camY)));
    map.style.transform =
      "translate(" + (-camX) + "px," + (-camY) + "px) scale(" + cameraZoom + ")";
  }

  function findNearest() {
    let best = null;
    let bestDist = INTERACT_R;
    Object.keys(SPOTS).forEach(function (key) {
      const s = SPOTS[key];
      const dx = player.x - s.x;
      const dy = player.y - s.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < bestDist) {
        bestDist = d;
        best = key;
      }
    });
    return best;
  }

  function updateStatus() {
    nearestSpot = findNearest();
    document.querySelectorAll(".landmark").forEach(function (el) {
      el.classList.toggle("is-near", el.getAttribute("data-spot") === nearestSpot);
    });
    if (!nearestSpot) {
      statusEl.textContent = "Explore nearby. Fog clears when you finish each place lesson.";
      return;
    }
    const spot = SPOTS[nearestSpot];
    const data = KipStorage.load();
    const u = KipStorage.unlocks(data);
    if (spot.unlock && !u[spot.unlock]) {
      statusEl.textContent = "Near " + nearestSpot + ", still locked. Finish its lesson first.";
      return;
    }
    if (spot.lesson) {
      statusEl.textContent = KipStorage.hasLesson(data, spot.lesson)
        ? "Near a finished lesson place. Press Interact to revisit."
        : "Near a lesson place. Press Interact to begin the full lesson.";
      return;
    }
    statusEl.textContent = "Near an unlocked activity. Press Interact.";
  }

  function tick() {
    let dx = 0;
    let dy = 0;
    if (keys.left) dx -= 1;
    if (keys.right) dx += 1;
    if (keys.up) dy -= 1;
    if (keys.down) dy += 1;

    const wasMoving = player.moving;
    player.moving = !!(dx || dy);

    if (player.moving) {
      const len = Math.sqrt(dx * dx + dy * dy) || 1;
      const stepX = (dx / len) * SPEED;
      const stepY = (dy / len) * SPEED;
      const nextX = player.x + stepX;
      const nextY = player.y + stepY;
      if (canStand(nextX, player.y)) player.x = nextX;
      if (canStand(player.x, nextY)) player.y = nextY;
      if (dx !== 0) player.facing = dx < 0 ? -1 : 1;
      if (dy < 0 && dx < 0) player.direction = "up-left";
      else if (dy < 0 && dx > 0) player.direction = "up-right";
      else if (dy > 0 && dx < 0) player.direction = "down-left";
      else if (dy > 0 && dx > 0) player.direction = "down-right";
      else if (dy < 0) player.direction = "up";
      else if (dy > 0) player.direction = "down";
      else if (dx < 0) player.direction = "left";
      else if (dx > 0) player.direction = "right";
      pet.x += (player.x - 48 - pet.x) * 0.08;
      pet.y += (player.y + 28 - pet.y) * 0.08;
    } else {
      pet.x += (player.x - 48 - pet.x) * 0.04;
      pet.y += (player.y + 28 - pet.y) * 0.04;
    }

    if (player.moving || player.moving !== wasMoving || !actorsReady) syncWalkVisual();
    placeActors();
    updateCamera();
    if (player.moving) updateStatus();
    requestAnimationFrame(tick);
  }

  function setKey(dir, pressed) {
    if (dir === "up-left") {
      keys.up = pressed;
      keys.left = pressed;
      return;
    }
    if (dir === "up-right") {
      keys.up = pressed;
      keys.right = pressed;
      return;
    }
    if (dir === "down-left") {
      keys.down = pressed;
      keys.left = pressed;
      return;
    }
    if (dir === "down-right") {
      keys.down = pressed;
      keys.right = pressed;
      return;
    }
    if (keys[dir] !== undefined) keys[dir] = pressed;
  }

  window.addEventListener("keydown", function (e) {
    if (!activityModal.hidden) return;
    const mapKeys = {
      ArrowUp: "up", w: "up", W: "up",
      ArrowDown: "down", s: "down", S: "down",
      ArrowLeft: "left", a: "left", A: "left",
      ArrowRight: "right", d: "right", D: "right"
    };
    if (mapKeys[e.key]) {
      e.preventDefault();
      setKey(mapKeys[e.key], true);
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      interact();
    }
    if ((e.key === "h" || e.key === "H") && !e.repeat) {
      e.preventDefault();
      harvestNearestWeed();
    }
  });

  window.addEventListener("keyup", function (e) {
    const mapKeys = {
      ArrowUp: "up", w: "up", W: "up",
      ArrowDown: "down", s: "down", S: "down",
      ArrowLeft: "left", a: "left", A: "left",
      ArrowRight: "right", d: "right", D: "right"
    };
    if (mapKeys[e.key]) setKey(mapKeys[e.key], false);
  });

  document.querySelectorAll(".touch-pad [data-dir]").forEach(function (btn) {
    const dir = btn.getAttribute("data-dir");
    btn.addEventListener("pointerdown", function (e) {
      e.preventDefault();
      setKey(dir, true);
    });
    btn.addEventListener("pointerup", function () { setKey(dir, false); });
    btn.addEventListener("pointerleave", function () { setKey(dir, false); });
  });

  document.getElementById("interact-btn").addEventListener("click", interact);
  document.getElementById("harvest-btn").addEventListener("click", harvestNearestWeed);

  function refreshClearing() {
    const pulled = document.querySelectorAll('.weed[data-pulled="1"]').length;
    const clearing = document.querySelector(".clearing-land");
    if (clearing) clearing.classList.toggle("is-clearer", pulled >= 3);
    const ring = document.querySelector(".clearing-ring");
    if (ring) ring.style.opacity = String(Math.min(1, 0.35 + pulled * 0.08));
  }

  function harvestWeed(weed) {
    const data = KipStorage.load();
    if (!KipStorage.unlocks(data).weeds) {
      statusEl.textContent = "Weed harvesting unlocks after the clearing lesson.";
      return false;
    }
    if (!weed || weed.dataset.pulled === "1" || weed.hidden) return false;
    weed.dataset.pulled = "1";
    weed.hidden = true;
    KipStorage.update(function (d) { d.weeds = (d.weeds || 0) + 1; });
    statusEl.textContent = "Pulled a weed! Sell weeds at the Flower Shop.";
    refreshClearing();
    refreshHud();
    return true;
  }

  function harvestNearestWeed() {
    let nearestWeed = null;
    let nearestDistance = Infinity;
    document.querySelectorAll(".weed").forEach(function (weed) {
      if (weed.hidden || weed.dataset.pulled === "1") return;
      const weedX = parseFloat(weed.style.left) || 0;
      const weedY = parseFloat(weed.style.top) || 0;
      const distance = Math.hypot(player.x - weedX, player.y - weedY);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestWeed = weed;
      }
    });
    if (nearestDistance > 105 || !harvestWeed(nearestWeed)) {
      if (KipStorage.unlocks(KipStorage.load()).weeds) {
        statusEl.textContent = "Move closer to a weed, then press H or Harvest.";
      }
    }
  }

  document.querySelectorAll(".weed").forEach(function (weed) {
    weed.addEventListener("click", function () { harvestWeed(weed); });
  });
  refreshClearing();

  function interact() {
    updateStatus();
    if (!nearestSpot) {
      statusEl.textContent = "Move closer to a landmark first.";
      return;
    }
    const spot = SPOTS[nearestSpot];
    const data = KipStorage.load();
    const u = KipStorage.unlocks(data);
    if (spot.unlock && !u[spot.unlock]) {
      statusEl.textContent = "That place unlocks after you clear its matching lesson.";
      return;
    }
    if (spot.lesson) openLesson(spot.lesson);
    else if (spot.activity) openActivity(spot.activity);
  }

  function hideControls() {
    btnCheck.hidden = true;
    btnNext.hidden = true;
    btnFinish.hidden = true;
    btnAction.hidden = true;
  }

  function openLesson(id) {
    const baseLesson = KipLessons[id];
    const saved = KipStorage.load();
    const isReview = KipStorage.hasLesson(saved, id);
    const reviewSets = window.KipLessonReviews && window.KipLessonReviews[id];
    const reviewNumber = (saved.lessonReviews && saved.lessonReviews[id]) || 0;
    activeLesson = Object.assign({}, baseLesson, {
      id: id,
      isReview: isReview && !!(reviewSets && reviewSets.length),
      reviewReward: 2,
      steps: isReview && reviewSets && reviewSets.length
        ? reviewSets[reviewNumber % reviewSets.length]
        : baseLesson.steps
    });
    activityMode = "lesson";
    stepIndex = 0;
    lessonState = {};
    activityModal.hidden = false;
    activityFeedback.textContent = "";
    renderStep();
  }

  function renderStep() {
    if (!activeLesson || !activeLesson.steps || !activeLesson.steps.length) return;
    if (stepIndex >= activeLesson.steps.length) stepIndex = activeLesson.steps.length - 1;
    const step = activeLesson.steps[stepIndex];
    activityBody.innerHTML = "";
    activityFeedback.textContent = "";
    hideControls();
    activityTitle.textContent = step.title || activeLesson.title;
    activityIntro.textContent = step.body || activeLesson.title;
    lessonProgress.textContent =
      "Step " + (stepIndex + 1) + " of " + activeLesson.steps.length;

    if (step.type === "teach" || step.type === "reflect") {
      activityIntro.textContent = "";
      activityBody.innerHTML = "<p class='teach-block'>" + step.body + "</p>";
      if (stepIndex >= activeLesson.steps.length - 1) btnFinish.hidden = false;
      else btnNext.hidden = false;
      return;
    }

    if (step.type === "sort") renderSort(step);
    if (step.type === "budget") renderBudget(step);
    if (step.type === "stack") renderStack(step);
    if (step.type === "match") renderMatch(step);
    if (step.type === "choice") renderChoice(step);
  }

  function renderSort(step) {
    const pool = document.createElement("div");
    pool.className = "sort-pool";
    const board = document.createElement("div");
    board.className = "sort-board";
    const needs = makeBin("Needs", "needs");
    const wants = makeBin("Wants", "wants");
    board.appendChild(needs.wrap);
    board.appendChild(wants.wrap);
    lessonState = { placements: {}, bins: { needs: needs.zone, wants: wants.zone }, step: step };
    step.items.forEach(function (item) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "chip";
      chip.textContent = item.label;
      chip.dataset.id = item.id;
      chip.addEventListener("click", function () {
        activityBody.querySelectorAll(".chip").forEach(function (c) { c.classList.remove("selected"); });
        chip.classList.add("selected");
        lessonState.selected = item.id;
      });
      pool.appendChild(chip);
    });
    needs.zone.parentElement.addEventListener("click", function () { placeSelected("needs"); });
    wants.zone.parentElement.addEventListener("click", function () { placeSelected("wants"); });
    const hint = document.createElement("p");
    hint.className = "muted";
    hint.textContent = "Tap an item, then tap Needs or Wants.";
    activityBody.appendChild(hint);
    activityBody.appendChild(pool);
    activityBody.appendChild(board);
    btnCheck.hidden = false;
  }

  function makeBin(title) {
    const wrap = document.createElement("div");
    wrap.className = "sort-column";
    const h = document.createElement("h3");
    h.textContent = title;
    const zone = document.createElement("div");
    zone.className = "drop-zone";
    wrap.appendChild(h);
    wrap.appendChild(zone);
    return { wrap: wrap, zone: zone };
  }

  function placeSelected(bin) {
    if (!lessonState.selected) return;
    const id = lessonState.selected;
    const chip = activityBody.querySelector('.chip[data-id="' + id + '"]');
    if (!chip) return;
    lessonState.bins[bin].appendChild(chip);
    chip.classList.remove("selected");
    lessonState.placements[id] = bin;
    lessonState.selected = null;
  }

  function renderBudget(step) {
    const wrap = document.createElement("div");
    wrap.className = "budget-builder";
    const income = document.createElement("p");
    income.innerHTML = "<strong>" + step.incomeLabel + ":</strong> $" + step.income.toFixed(2);
    wrap.appendChild(income);
    lessonState = { values: {}, step: step };
    step.rows.forEach(function (row) {
      const line = document.createElement("div");
      line.className = "budget-row";
      const label = document.createElement("label");
      label.textContent = row.label;
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.step = "0.5";
      input.value = "0";
      input.addEventListener("input", function () {
        lessonState.values[row.id] = Number(input.value) || 0;
      });
      lessonState.values[row.id] = 0;
      line.appendChild(label);
      line.appendChild(input);
      wrap.appendChild(line);
    });
    activityBody.appendChild(wrap);
    btnCheck.hidden = false;
  }

  function renderStack(step) {
    lessonState = { saved: step.start, spentTempt: false, step: step };
    const wrap = document.createElement("div");
    wrap.className = "stack-game";
    const status = document.createElement("p");
    status.id = "stack-status";
    const meter = document.createElement("div");
    meter.className = "stack-meter";
    const fill = document.createElement("div");
    fill.className = "stack-fill";
    fill.id = "stack-fill";
    meter.appendChild(fill);
    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "btn btn-primary";
    addBtn.textContent = "Add $3 from chores";
    addBtn.addEventListener("click", function () {
      lessonState.saved = Math.min(step.goal, lessonState.saved + 3);
      updateStackUI();
    });
    const temptBtn = document.createElement("button");
    temptBtn.type = "button";
    temptBtn.className = "btn btn-soft";
    temptBtn.textContent = step.temptLabel;
    temptBtn.addEventListener("click", function () {
      if (lessonState.saved < step.temptAmount) {
        activityFeedback.textContent = "Not enough saved for that.";
        return;
      }
      lessonState.saved -= step.temptAmount;
      lessonState.spentTempt = true;
      activityFeedback.textContent = "Temptation bought. The goal got farther.";
      updateStackUI();
    });
    wrap.appendChild(status);
    wrap.appendChild(meter);
    wrap.appendChild(addBtn);
    wrap.appendChild(temptBtn);
    activityBody.appendChild(wrap);
    btnCheck.hidden = false;
    updateStackUI();
  }

  function updateStackUI() {
    const step = lessonState.step;
    const status = document.getElementById("stack-status");
    const fill = document.getElementById("stack-fill");
    if (!status || !fill) return;
    status.innerHTML = "Saved: <strong>$" + lessonState.saved + "</strong> / $" + step.goal;
    fill.style.width = Math.round((lessonState.saved / step.goal) * 100) + "%";
  }

  function renderMatch(step) {
    const grid = document.createElement("div");
    grid.className = "match-grid";
    lessonState = { answers: {}, step: step };
    step.pairs.forEach(function (pair) {
      const row = document.createElement("div");
      row.className = "match-row";
      const prompt = document.createElement("p");
      prompt.style.margin = "0";
      prompt.style.fontWeight = "700";
      prompt.textContent = pair.prompt;
      const select = document.createElement("select");
      const placeholder = document.createElement("option");
      placeholder.value = "";
      placeholder.textContent = "Pick a prep move";
      select.appendChild(placeholder);
      pair.options.forEach(function (opt) {
        const option = document.createElement("option");
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
      });
      select.addEventListener("change", function () {
        lessonState.answers[pair.id] = select.value;
      });
      row.appendChild(prompt);
      row.appendChild(select);
      grid.appendChild(row);
    });
    activityBody.appendChild(grid);
    btnCheck.hidden = false;
  }

  function renderChoice(step) {
    activityIntro.textContent = step.prompt;
    const list = document.createElement("div");
    list.className = "choice-list";
    lessonState = { selected: null, step: step };
    step.options.forEach(function (opt) {
      const label = document.createElement("label");
      label.className = "choice-option";
      const input = document.createElement("input");
      input.type = "radio";
      input.name = "lesson-choice";
      input.value = opt.id;
      input.addEventListener("change", function () { lessonState.selected = opt.id; });
      const span = document.createElement("span");
      span.textContent = opt.label;
      label.appendChild(input);
      label.appendChild(span);
      list.appendChild(label);
    });
    activityBody.appendChild(list);
    btnCheck.hidden = false;
  }

  function checkStep() {
    const step = activeLesson.steps[stepIndex];
    let result = { ok: false, message: "Keep trying." };

    if (step.type === "sort") {
      const placements = lessonState.placements || {};
      const allPlaced = step.items.every(function (item) { return placements[item.id]; });
      if (!allPlaced) result = { ok: false, message: "Place every item before checking." };
      else {
        const correct = step.items.every(function (item) { return placements[item.id] === item.bin; });
        result = correct
          ? { ok: true, message: "Great sorting." }
          : { ok: false, message: "One or more items are in the wrong basket." };
      }
    }
    if (step.type === "budget") result = step.rule(lessonState.values, step.income);
    if (step.type === "stack") {
      result = lessonState.saved >= step.goal
        ? { ok: true, message: "You reached the goal!" }
        : { ok: false, message: "Keep climbing until you hit $" + step.goal + "." };
    }
    if (step.type === "match") {
      const missing = step.pairs.some(function (pair) { return !lessonState.answers[pair.id]; });
      if (missing) result = { ok: false, message: "Choose a prep move for every charge." };
      else {
        const correct = step.pairs.every(function (pair) {
          return lessonState.answers[pair.id] === pair.answer;
        });
        result = correct
          ? { ok: true, message: "Those prep moves will keep surprises small." }
          : { ok: false, message: "Not quite. Think about planning ahead." };
      }
    }
    if (step.type === "choice") {
      if (!lessonState.selected) result = { ok: false, message: "Pick one choice first." };
      else {
        const picked = step.options.find(function (o) { return o.id === lessonState.selected; });
        result = picked && picked.correct
          ? { ok: true, message: step.explain }
          : { ok: false, message: "That choice could squeeze your plan. Try another." };
      }
    }

    activityFeedback.textContent = result.message;
    if (!result.ok) return;
    btnCheck.hidden = true;
    if (stepIndex >= activeLesson.steps.length - 1) btnFinish.hidden = false;
    else btnNext.hidden = false;
  }

  function openActivity(kind) {
    activityMode = kind;
    activeLesson = null;
    hideControls();
    activityModal.hidden = false;
    lessonProgress.textContent = "";
    activityFeedback.textContent = "";
    activityBody.innerHTML = "";
    const data = KipStorage.load();

    if (kind === "shop") {
      activityTitle.textContent = "Flower Shop";
      activityIntro.textContent = "Trade nest tokens or weeds for flowers.";
      activityBody.innerHTML =
        "<p>Tokens: <strong>" + (data.tokens || 0) + "</strong> · Weeds: <strong>" +
        (data.weeds || 0) + "</strong></p>" +
        "<div class='choice-list'>" +
        "<button type='button' class='btn btn-primary' id='trade-token'>Trade 1 token for 2 flowers</button>" +
        "<button type='button' class='btn btn-soft' id='trade-weed'>Sell 1 weed for 3 flowers</button>" +
        "</div>";
      document.getElementById("trade-token").addEventListener("click", function () {
        let msg = "";
        KipStorage.update(function (d) {
          if ((d.tokens || 0) < 1) { msg = "Need a nest token."; return; }
          d.tokens -= 1;
          d.flowers = (d.flowers || 0) + 2;
          msg = "Traded a token for 2 flowers.";
        });
        activityFeedback.textContent = msg;
        refreshHud();
      });
      document.getElementById("trade-weed").addEventListener("click", function () {
        let msg = "";
        KipStorage.update(function (d) {
          if ((d.weeds || 0) < 1) { msg = "Pull weeds first."; return; }
          d.weeds -= 1;
          d.flowers = (d.flowers || 0) + 3;
          msg = "Sold a weed for 3 flowers.";
        });
        activityFeedback.textContent = msg;
        refreshHud();
      });
    }

    if (kind === "bank") {
      activityTitle.textContent = "Flower Bank";
      activityIntro.textContent = "Store flowers safely.";
      function paintBank() {
        const latest = KipStorage.load();
        activityBody.innerHTML =
          "<p>Pocket: <strong>" + (latest.flowers || 0) +
          "</strong> · Banked: <strong>" + (latest.bankedFlowers || 0) + "</strong></p>" +
          "<div class='choice-list'>" +
          "<button type='button' class='btn btn-primary' id='bank-deposit'>Bank 2 flowers</button>" +
          "<button type='button' class='btn btn-soft' id='bank-withdraw'>Take 2 out</button>" +
          "</div>";
        document.getElementById("bank-deposit").addEventListener("click", function () {
          let msg = "";
          KipStorage.update(function (d) {
            if ((d.flowers || 0) < 2) { msg = "Need 2 flowers."; return; }
            d.flowers -= 2;
            d.bankedFlowers = (d.bankedFlowers || 0) + 2;
            msg = "Banked 2 flowers.";
          });
          activityFeedback.textContent = msg;
          refreshHud();
          paintBank();
        });
        document.getElementById("bank-withdraw").addEventListener("click", function () {
          let msg = "";
          KipStorage.update(function (d) {
            if ((d.bankedFlowers || 0) < 2) { msg = "Bank is short."; return; }
            d.bankedFlowers -= 2;
            d.flowers = (d.flowers || 0) + 2;
            msg = "Withdrew 2 flowers.";
          });
          activityFeedback.textContent = msg;
          refreshHud();
          paintBank();
        });
      }
      paintBank();
    }

    if (kind === "planner") {
      activityTitle.textContent = "Planner Post";
      activityIntro.textContent = "Your Money Journal pins appear here.";
      if (!data.upcoming.length) {
        activityBody.innerHTML = "<p>No upcoming charges pinned yet.</p>";
      } else {
        activityBody.innerHTML = "<ul class='entry-list'>" + data.upcoming.map(function (c) {
          return "<li><div class='entry-meta'><span>" + c.label +
            "</span><span class='entry-date'>" + KipFinance.formatDate(c.dueDate) +
            "</span></div><span class='entry-amount out'>" + KipFinance.formatMoney(c.amount) +
            "</span></li>";
        }).join("") + "</ul>";
      }
      const bal = KipFinance.balance(data);
      const need = KipFinance.upcomingTotal(data);
      const today = new Date().toISOString().slice(0, 10);
      activityFeedback.textContent = bal >= need
        ? "Your pocket covers these pins."
        : "Need " + KipFinance.formatMoney(need - bal) + " more to cover pins.";
      if (bal >= need && data.upcoming.length && data.plannerBonusToday !== today) {
        btnAction.hidden = false;
        btnAction.textContent = "Collect planning flower";
        btnAction.onclick = function () {
          KipStorage.update(function (d) {
            if (d.plannerBonusToday === today) return;
            d.flowers = (d.flowers || 0) + 1;
            d.plannerBonusToday = today;
          });
          activityFeedback.textContent = "Planning bonus collected.";
          btnAction.hidden = true;
          refreshHud();
        };
      }
    }

    if (kind === "gift") {
      activityTitle.textContent = "Gift Nook";
      activityIntro.textContent = "Pick a need-smart gift idea for flowers.";
      activityBody.innerHTML =
        "<div class='choice-list'>" +
        "<label class='choice-option'><input type='radio' name='gift' value='book'><span>Library book for a friend</span></label>" +
        "<label class='choice-option'><input type='radio' name='gift' value='snack'><span>Giant candy mountain</span></label>" +
        "<label class='choice-option'><input type='radio' name='gift' value='socks'><span>Warm socks in winter</span></label>" +
        "</div>";
      btnAction.hidden = false;
      btnAction.textContent = "Offer gift idea";
      btnAction.onclick = function () {
        const picked = activityBody.querySelector('input[name="gift"]:checked');
        if (!picked) {
          activityFeedback.textContent = "Pick a gift idea first.";
          return;
        }
        if (picked.value === "snack") {
          activityFeedback.textContent = "That is mostly a want. Try a need-smart idea.";
          return;
        }
        let msg = "";
        KipStorage.update(function (d) {
          const today = new Date().toISOString().slice(0, 10);
          if (d.giftBonusDay === today) {
            msg = "You already shared a gift idea today.";
            return;
          }
          d.giftBonusDay = today;
          d.flowers = (d.flowers || 0) + 2;
          msg = "Thoughtful choice! You earned 2 flowers.";
        });
        activityFeedback.textContent = msg;
        refreshHud();
      };
    }
  }

  btnCheck.addEventListener("click", checkStep);
  btnNext.addEventListener("click", function () {
    if (!activeLesson || stepIndex >= activeLesson.steps.length - 1) {
      btnNext.hidden = true;
      btnFinish.hidden = false;
      return;
    }
    stepIndex = Math.min(stepIndex + 1, activeLesson.steps.length - 1);
    renderStep();
  });
  btnFinish.addEventListener("click", function () {
    if (activeLesson.isReview) {
      KipStorage.update(function (data) {
        data.lessonReviews = data.lessonReviews || {};
        data.lessonReviews[activeLesson.id] = (data.lessonReviews[activeLesson.id] || 0) + 1;
        data.flowers = (data.flowers || 0) + activeLesson.reviewReward;
      });
      activityFeedback.textContent = "Review complete! You earned " + activeLesson.reviewReward + " flowers. A fresh question set will be ready next time.";
      btnFinish.hidden = true;
      refreshHud();
      window.setTimeout(function () {
        activityModal.hidden = true;
        updateStatus();
      }, 1700);
      return;
    }
    const first = KipCreature.completeLesson(
      activeLesson.id,
      activeLesson.flowerBonus,
      activeLesson.mapRegion
    );
    activityFeedback.textContent = first
      ? activeLesson.unlockNote + " You earned flowers and nest tokens."
      : "You already cleared this lesson.";
    btnFinish.hidden = true;
    refreshHud();
    window.setTimeout(function () {
      activityModal.hidden = true;
      updateStatus();
    }, 1500);
  });
  btnClose.addEventListener("click", function () {
    activityModal.hidden = true;
  });

  window.addEventListener("resize", updateCamera);

  refreshHud();
  placeActors();
  updateCamera();
  updateStatus();
  requestAnimationFrame(tick);
})();
