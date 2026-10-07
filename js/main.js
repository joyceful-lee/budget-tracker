(function () {
  const onboardModal = document.getElementById("onboard-modal");
  const onboardForm = document.getElementById("onboard-form");
  const onboardTitle = document.getElementById("onboard-title");
  const onboardError = document.getElementById("onboard-error");
  const nestLayout = document.getElementById("nest-layout");
  const eggGrid = document.getElementById("egg-grid");
  const hatchBtn = document.getElementById("hatch-btn");
  const hatchOverlay = document.getElementById("hatch-overlay");
  const hatchEgg = document.getElementById("hatch-egg");
  const hatchText = document.getElementById("hatch-text");
  const wrap = document.getElementById("creature-wrap");
  const host = document.getElementById("creature-svg-host");
  const speechEl = document.getElementById("creature-speech");
  const feedback = document.getElementById("care-feedback");
  const petNameDisplay = document.getElementById("pet-name-display");
  const speciesLabel = document.getElementById("pet-species-label");
  const goalLabel = document.getElementById("goal-label");
  const goalSaved = document.getElementById("goal-saved");
  const goalTarget = document.getElementById("goal-target");
  const goalDeadline = document.getElementById("goal-deadline");
  const xpFill = document.getElementById("xp-fill");
  const fullnessFill = document.getElementById("fill-fullness");
  const fullnessText = document.getElementById("stat-fullness");
  const mealHint = document.getElementById("meal-hint");
  const reviveCount = document.getElementById("revive-count");
  const railActions = document.getElementById("rail-actions");
  const reviveActions = document.getElementById("revive-actions");
  const completeActions = document.getElementById("complete-actions");
  const journalList = document.getElementById("journal-list");
  const grassField = document.getElementById("grass-field");
  const careEffect = document.getElementById("care-effect");
  const nestStage = document.querySelector(".nest-stage");
  const weatherBadge = document.getElementById("home-weather-badge");
  const orbitFeed = document.getElementById("orbit-feed");
  const orbitPlay = document.getElementById("orbit-play");
  const formIn = document.getElementById("form-money-in");
  const formOut = document.getElementById("form-money-out");
  const moneyInCopy = document.getElementById("money-in-copy");
  const reviveModal = document.getElementById("revive-modal");
  const reviveForm = document.getElementById("revive-form");
  const reviveTitle = document.getElementById("revive-title");
  const reviveCopy = document.getElementById("revive-copy");
  const revivePortrait = document.getElementById("revive-portrait");
  const reviveDeadlineWrap = document.getElementById("revive-deadline-wrap");
  const reviveError = document.getElementById("revive-error");
  const memoryModal = document.getElementById("memory-modal");
  const memoryGrid = document.getElementById("memory-grid");
  const growthModal = document.getElementById("growth-modal");
  const growthEyebrow = document.getElementById("growth-eyebrow");
  const growthReveal = document.getElementById("growth-reveal");
  const growthTitle = document.getElementById("growth-title");
  const growthCopy = document.getElementById("growth-copy");

  const IDLE_CLASSES = ["idle-tilt", "idle-stretch", "idle-hop", "idle-wiggle"];
  let selectedEgg = null;
  let idleTimer = null;
  // Remember whether the pet was alive at the last render so a death pops the revive modal once.
  let wasAlive = null;

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function openModal(el) { el.hidden = false; }
  function closeModal(el) { el.hidden = true; }

  document.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      closeModal(document.getElementById(btn.getAttribute("data-close")));
    });
  });

  document.querySelectorAll(".modal").forEach(function (modal) {
    if (modal === onboardModal) return;
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.hidden = true;
    });
  });

  function buildGrass() {
    if (!grassField || grassField.childElementCount) return;
    var i;
    for (i = 0; i < 96; i++) {
      const blade = document.createElement("span");
      const depth = Math.random();
      const scale = 1 - depth * 0.72;
      blade.className = "grass-tuft";
      blade.style.left = (Math.random() * 100) + "%";
      blade.style.bottom = (depth * 97) + "%";
      blade.style.height = (18 + Math.random() * 28) + "px";
      blade.style.setProperty("--lean", ((Math.random() * 24) - 12) + "deg");
      blade.style.setProperty("--scale", scale.toFixed(2));
      blade.style.setProperty("--shade", Math.random() > 0.5 ? "#3f7a45" : "#4f8f55");
      blade.style.opacity = (0.48 + scale * 0.52).toFixed(2);
      grassField.appendChild(blade);
    }
    for (i = 0; i < 28; i++) {
      const flower = document.createElement("span");
      const depth = Math.random();
      const scale = 1 - depth * 0.7;
      flower.className = "meadow-flower";
      flower.style.left = (6 + Math.random() * 88) + "%";
      flower.style.bottom = (4 + depth * 92) + "%";
      flower.style.setProperty("--scale", scale.toFixed(2));
      flower.style.opacity = (0.58 + scale * 0.42).toFixed(2);
      flower.style.setProperty("--petal", ["#e8a08a", "#f0c15a", "#9ec9e0", "#f4d6e2"][i % 4]);
      grassField.appendChild(flower);
    }
  }

  function clearIdleClasses() {
    IDLE_CLASSES.forEach(function (c) { wrap.classList.remove(c); });
  }

  function scheduleIdle() {
    if (idleTimer) window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(function () {
      if (!wrap || wrap.closest("[hidden]") || wrap.classList.contains("is-dead")) {
        scheduleIdle();
        return;
      }
      clearIdleClasses();
      const pick = IDLE_CLASSES[Math.floor(Math.random() * IDLE_CLASSES.length)];
      wrap.classList.add(pick);
      window.setTimeout(function () {
        wrap.classList.remove(pick);
        scheduleIdle();
      }, 900);
    }, 2800 + Math.random() * 4200);
  }

  function renderEggs() {
    eggGrid.innerHTML = "";
    KipStorage.EGGS.forEach(function (egg) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "egg-choice";
      btn.setAttribute("role", "option");
      btn.dataset.egg = egg.id;
      btn.innerHTML =
        '<span class="egg-shell" style="--shell:' + egg.shell + ';--speck:' + egg.speck + '"></span>' +
        "<strong>" + egg.label + "</strong>";
      btn.addEventListener("click", function () {
        selectedEgg = egg.id;
        eggGrid.querySelectorAll(".egg-choice").forEach(function (el) {
          el.classList.remove("is-selected");
        });
        btn.classList.add("is-selected");
        onboardError.textContent = "";
      });
      eggGrid.appendChild(btn);
    });
  }

  function describeDaysLeft(data) {
    const days = KipFinance.daysLeft(data);
    if (days <= 0) return "Deadline passed";
    if (days < 1) return "Due today";
    const whole = Math.floor(days);
    return whole + (whole === 1 ? " day left" : " days left");
  }

  function renderJournal(data) {
    const alive = data.creature.alive;
    journalList.innerHTML = "";
    if (!data.transactions.length) {
      const empty = document.createElement("li");
      empty.className = "entry-empty";
      empty.textContent = "No entries yet. Log money in to feed " + data.petName + ".";
      journalList.appendChild(empty);
      return;
    }
    data.transactions.slice().reverse().forEach(function (item) {
      const li = document.createElement("li");
      const meta = document.createElement("div");
      meta.className = "entry-meta";
      const title = document.createElement("span");
      title.textContent = item.label;
      const date = document.createElement("span");
      date.className = "entry-date";
      date.textContent = KipFinance.formatDate(item.date);
      meta.appendChild(title);
      meta.appendChild(date);

      const amount = document.createElement("span");
      amount.className = "entry-amount" + (item.type === "out" ? " out" : "");
      amount.textContent = (item.type === "out" ? "−" : "+") + KipFinance.formatMoney(item.amount);

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "btn-remove";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove " + item.label);
      remove.disabled = !alive;
      remove.addEventListener("click", function () {
        KipCreature.removeTransaction(item.id);
        render();
      });

      li.appendChild(meta);
      li.appendChild(amount);
      li.appendChild(remove);
      journalList.appendChild(li);
    });
  }

  function render() {
    const data = KipCreature.sync();
    if (!data.onboarded) return;
    const c = data.creature;
    const species = KipStorage.getSpecies(data.speciesId);
    const complete = KipCreature.isComplete(data);
    const alive = c.alive;
    const progress = KipFinance.progress(data);

    KipCreature.applyBrand();
    document.querySelectorAll("[data-revive-label]").forEach(function (el) { el.textContent = "Revive " + data.petName; });
    petNameDisplay.textContent = data.petName;
    speciesLabel.textContent = (alive ? capitalize(c.age) : "Resting") + " " + species.label + " · " + species.element;
    host.innerHTML = KipCreature.petSvgMarkup(data, "creature");

    goalLabel.textContent = data.goal.label;
    goalSaved.textContent = KipFinance.formatMoney(KipFinance.saved(data));
    goalTarget.textContent = KipFinance.formatMoney(data.goal.target);
    xpFill.style.width = Math.round(progress * 100) + "%";
    goalDeadline.textContent = complete
      ? "Goal reached! 🎉"
      : "Due " + KipFinance.formatDate(data.goal.deadline) + " · " + describeDaysLeft(data);

    const full = Math.round(c.fullness);
    fullnessFill.style.width = full + "%";
    fullnessFill.classList.toggle("is-low", full < 25);
    fullnessText.textContent = full;
    if (!alive) {
      mealHint.textContent = "";
    } else if (complete) {
      mealHint.textContent = data.petName + " is all grown up and never hungry again.";
    } else if (c.starvingSince) {
      const hoursLeft = Math.max(0, KipCreature.STARVE_GRACE_HOURS - (Date.now() - c.starvingSince) / 3600000);
      mealHint.textContent = "Starving! Feed within " + Math.ceil(hoursLeft) + "h or " + data.petName + " will pass away.";
    } else {
      mealHint.textContent = "A full meal is about " + KipFinance.formatMoney(KipFinance.fullMeal(data)) +
        ". A full belly lasts about " + Math.round(KipFinance.hoursToEmpty(data)) + " hours.";
    }
    reviveCount.textContent = c.revives || 0;

    railActions.hidden = complete || !alive;
    reviveActions.hidden = alive;
    completeActions.hidden = !complete;
    orbitFeed.disabled = !alive || complete;
    orbitPlay.disabled = !alive;
    moneyInCopy.textContent = "Money in counts toward your goal and feeds " + data.petName + ".";
    if (!alive) closeModal(document.getElementById("money-modal"));

    const mood = KipCreature.mood(data);
    const weather = mood === "happy" ? "sunny" : mood === "okay" ? "cloudy" : "rainy";
    nestStage.classList.remove("weather-sunny", "weather-cloudy", "weather-rainy");
    nestStage.classList.add("weather-" + weather);
    weatherBadge.textContent = mood === "dead" ? "Resting in peace"
      : complete ? "Goal complete!"
      : mood === "happy" ? "Well fed"
      : mood === "okay" ? "Getting peckish"
      : "Hungry!";
    wrap.classList.remove("is-glowing", "is-hungry", "is-dead");
    if (mood === "dead") wrap.classList.add("is-dead");
    else if (mood === "hungry") wrap.classList.add("is-hungry");
    else if (mood === "happy") wrap.classList.add("is-glowing");
    speechEl.textContent = KipCreature.speechForState(data);

    renderJournal(data);

    if (wasAlive === true && !alive) showRevive();
    wasAlive = alive;
  }

  function celebrate(action, text) {
    clearIdleClasses();
    wrap.classList.add("is-happy", "care-" + action);
    careEffect.className = "care-effect effect-" + action + " is-active";
    careEffect.textContent = text;
    window.setTimeout(function () {
      wrap.classList.remove("is-happy", "care-" + action);
      careEffect.className = "care-effect";
    }, 1000);
  }

  function showGrowth(data, completed) {
    const age = data.creature.age;
    growthEyebrow.textContent = completed ? "Goal reached!" : "Halfway there!";
    growthTitle.textContent = completed
      ? data.petName + " reached their final form!"
      : data.petName + " evolved into a " + age + "!";
    growthReveal.innerHTML = KipCreature.petSvgMarkup(data, "creature growth-creature");
    growthCopy.textContent = completed
      ? "You saved " + KipFinance.formatMoney(data.goal.target) + " for " + data.goal.label + ". Start a new goal whenever you're ready."
      : "You've saved half of your goal. Keep going to reach the final form!";
    window.setTimeout(function () { openModal(growthModal); }, 450);
  }

  function showRevive() {
    const data = KipStorage.load();
    const expired = KipFinance.daysLeft(data) <= 0;
    reviveTitle.textContent = data.petName + " has passed away";
    revivePortrait.innerHTML = KipCreature.petSvgMarkup(data, "creature growth-creature");
    reviveCopy.textContent = data.creature.deathReason === "deadline"
      ? "The deadline arrived before " + data.goal.label + " was fully saved. Pick a new deadline to bring " + data.petName + " back."
      : data.petName + " went hungry for too long. You can revive them, but it will be counted.";
    reviveDeadlineWrap.hidden = !expired;
    reviveForm.deadline.min = KipFinance.todayIso(1);
    reviveForm.deadline.value = "";
    reviveError.textContent = "";
    openModal(reviveModal);
  }

  function showNest() {
    onboardModal.hidden = true;
    nestLayout.hidden = false;
    buildGrass();
    wasAlive = null;
    render();
    scheduleIdle();
    if (!KipStorage.load().creature.alive) showRevive();
  }

  function showOnboarding(message) {
    onboardModal.hidden = false;
    nestLayout.hidden = true;
    onboardTitle.textContent = message || "Set a savings goal and hatch a friend";
    onboardForm.reset();
    onboardForm.deadline.min = KipFinance.todayIso(1);
    onboardError.textContent = "";
    selectedEgg = null;
    renderEggs();
  }

  function runHatch(petName, eggId, goal) {
    const egg = KipStorage.getEgg(eggId);
    hatchOverlay.hidden = false;
    hatchEgg.style.setProperty("--shell", egg.shell);
    hatchEgg.style.setProperty("--speck", egg.speck);
    hatchEgg.classList.add("is-shaking");
    hatchText.textContent = "Something is wiggling...";

    window.setTimeout(function () {
      hatchEgg.classList.remove("is-shaking");
      hatchEgg.classList.add("is-cracking");
      hatchText.textContent = "Crack!";
    }, 1100);

    window.setTimeout(function () {
      KipCreature.hatch(petName, eggId, goal);
      hatchOverlay.hidden = true;
      hatchEgg.classList.remove("is-cracking");
      showNest();
      wrap.classList.add("is-happy");
      feedback.textContent = petName + " hatched! Log money in to keep them fed.";
      window.setTimeout(function () { wrap.classList.remove("is-happy"); }, 900);
    }, 2000);
  }

  hatchBtn.addEventListener("click", function () {
    const goal = onboardForm.goal.value.trim();
    const target = Number(onboardForm.target.value);
    const deadline = onboardForm.deadline.value;
    const petName = onboardForm.petName.value.trim();
    let error = "";
    if (!goal) error = "Describe what you're saving for.";
    else if (!(target > 0)) error = "Enter a goal amount above $0.";
    else if (!deadline || deadline <= KipFinance.todayIso()) error = "Pick a deadline after today.";
    else if (!petName) error = "Give your pet a name.";
    else if (!selectedEgg) error = "Pick an egg to hatch.";
    if (error) {
      onboardError.textContent = error;
      return;
    }
    onboardModal.hidden = true;
    runHatch(petName, selectedEgg, {
      label: goal,
      target: Math.round(target * 100) / 100,
      deadline: deadline,
      createdAt: Date.now()
    });
  });

  function switchTab(which) {
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("is-active", t.getAttribute("data-tab") === which);
    });
    document.querySelectorAll(".tab-panel").forEach(function (panel) {
      panel.hidden = panel.getAttribute("data-panel") !== which;
    });
  }

  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () { switchTab(tab.getAttribute("data-tab")); });
  });

  document.querySelectorAll("[data-open-money]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const which = btn.getAttribute("data-open-money");
      switchTab(which);
      openModal(document.getElementById("money-modal"));
      (which === "in" ? formIn : formOut).label.focus();
    });
  });

  function submitMoney(form, type) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const label = form.label.value.trim();
      const amount = Math.round(Number(form.amount.value) * 100) / 100;
      if (!label || !(amount > 0)) return;
      const result = KipCreature.logMoney(type, label, amount);
      closeModal(document.getElementById("money-modal"));
      const data = KipStorage.load();
      if (!result.ok) {
        render();
        return;
      }
      form.reset();
      if (type === "in") {
        feedback.textContent = result.fed
          ? data.petName + " ate! +" + KipFinance.formatMoney(amount) + " saved."
          : "+" + KipFinance.formatMoney(amount) + " saved.";
        if (result.fed) celebrate("feed", "🍓  🍃  ✦");
      } else {
        feedback.textContent = "−" + KipFinance.formatMoney(amount) + " logged as money out.";
      }
      render();
      if (result.grew || result.completed) showGrowth(data, result.completed);
    });
  }
  submitMoney(formIn, "in");
  submitMoney(formOut, "out");

  orbitPlay.addEventListener("click", function () {
    if (!KipStorage.load().creature.alive) return;
    const line = KipCreature.play();
    celebrate("play", "★  ✦  ★");
    speechEl.textContent = line;
  });

  document.getElementById("open-revive").addEventListener("click", showRevive);

  reviveForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const deadline = reviveForm.deadline.value;
    if (!reviveDeadlineWrap.hidden && (!deadline || deadline <= KipFinance.todayIso())) {
      reviveError.textContent = "Pick a new deadline after today.";
      return;
    }
    const result = KipCreature.revive(deadline);
    if (!result.ok) {
      reviveError.textContent = "Couldn't revive. Try a later deadline.";
      return;
    }
    closeModal(reviveModal);
    const data = KipStorage.load();
    feedback.textContent = data.petName + " is back! Revived " + data.creature.revives + (data.creature.revives === 1 ? " time." : " times.");
    render();
    celebrate("feed", "✦  ♥  ✦");
    if (result.grew || result.completed) showGrowth(data, result.completed);
  });

  function startNewGoal(message) {
    KipCreature.retire();
    closeModal(reviveModal);
    showOnboarding(message);
  }

  document.getElementById("release-btn").addEventListener("click", function () {
    if (!window.confirm("Move this pet to the Memory Box and start a new goal?")) return;
    startNewGoal("A fresh start: set your next goal");
  });

  document.getElementById("new-goal-btn").addEventListener("click", function () {
    startNewGoal("Nice saving! What's your next goal?");
  });

  function renderMemories() {
    const data = KipStorage.load();
    memoryGrid.innerHTML = "";

    const history = document.createElement("section");
    history.className = "memory-row";
    history.innerHTML = "<h3>Past pets</h3>";
    const list = document.createElement("ul");
    list.className = "entry-list";
    if (!data.pastPets.length) {
      list.innerHTML = '<li class="entry-empty">Pets you finish or release will be remembered here.</li>';
    }
    data.pastPets.slice().reverse().forEach(function (pet) {
      const li = document.createElement("li");
      const meta = document.createElement("div");
      meta.className = "entry-meta";
      const name = document.createElement("span");
      name.textContent = pet.petName + " · " + pet.goalLabel;
      const detail = document.createElement("span");
      detail.className = "entry-date";
      detail.textContent = (pet.outcome === "complete" ? "Goal reached" : "Released") +
        " · revived " + pet.revives + (pet.revives === 1 ? " time" : " times");
      meta.appendChild(name);
      meta.appendChild(detail);
      const amount = document.createElement("span");
      amount.className = "entry-amount";
      amount.textContent = KipFinance.formatMoney(pet.saved) + " / " + KipFinance.formatMoney(pet.target);
      li.appendChild(meta);
      li.appendChild(amount);
      list.appendChild(li);
    });
    history.appendChild(list);
    memoryGrid.appendChild(history);

    const ids = ["air", "water", "fire", "earth", "metal", "electric", "dark", "fairy", "money"];
    ids.forEach(function (id) {
      const species = KipStorage.getSpecies(id);
      const elementUnlocked = KipCreature.GOAL_STAGES.some(function (stage) {
        return !!data.memories[id + ":" + stage];
      });
      const row = document.createElement("section");
      row.className = "memory-row";
      const title = document.createElement("h3");
      title.textContent = id === "money" && !elementUnlocked ? "??? · Hidden creature" : species.element + " · " + species.label;
      row.appendChild(title);
      const stages = document.createElement("div");
      stages.className = "memory-stages";
      KipCreature.GOAL_STAGES.forEach(function (stage) {
        const memory = data.memories[id + ":" + stage];
        const card = document.createElement("div");
        card.className = "memory-slot" + (memory ? " is-unlocked" : " is-locked");
        const fake = { speciesId: id, creature: { age: stage } };
        card.innerHTML = '<div class="memory-portrait">' + KipCreature.petSvgMarkup(fake, "creature memory-creature") + "</div>" +
          "<strong>" + capitalize(stage) + "</strong><small></small>";
        card.querySelector("small").textContent = memory ? memory.petName : "Locked";
        stages.appendChild(card);
      });
      row.appendChild(stages);
      memoryGrid.appendChild(row);
    });
  }

  document.getElementById("memory-box-open").addEventListener("click", function () {
    renderMemories();
    openModal(memoryModal);
  });

  // Hunger keeps ticking while the page is open.
  window.setInterval(function () {
    if (!nestLayout.hidden) render();
  }, 60000);

  if (!KipStorage.load().onboarded) showOnboarding();
  else showNest();
})();
