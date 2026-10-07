(function () {
  const petId = new URLSearchParams(window.location.search).get("id");
  if (!petId || !KipStorage.findPet(KipStorage.load(), petId)) {
    window.location.replace("index.html");
    return;
  }

  const deviceHost = document.getElementById("device-slot");
  const titleName = document.getElementById("title-name");
  const titleGoal = document.getElementById("title-goal");
  const feedback = document.getElementById("care-feedback");
  const petNameDisplay = document.getElementById("pet-name-display");
  const speciesLabel = document.getElementById("pet-species-label");
  const goalSaved = document.getElementById("goal-saved");
  const goalTarget = document.getElementById("goal-target");
  const goalDeadline = document.getElementById("goal-deadline");
  const xpFill = document.getElementById("xp-fill");
  const fullnessFill = document.getElementById("fill-fullness");
  const fullnessText = document.getElementById("stat-fullness");
  const mealHint = document.getElementById("meal-hint");
  const reviveCount = document.getElementById("revive-count");
  const reviveActions = document.getElementById("revive-actions");
  const completeActions = document.getElementById("complete-actions");
  const journalList = document.getElementById("journal-list");
  const moneyModal = document.getElementById("money-modal");
  const formIn = document.getElementById("form-money-in");
  const formOut = document.getElementById("form-money-out");
  const reviveModal = document.getElementById("revive-modal");
  const reviveForm = document.getElementById("revive-form");
  const reviveTitle = document.getElementById("revive-title");
  const reviveCopy = document.getElementById("revive-copy");
  const revivePortrait = document.getElementById("revive-portrait");
  const reviveDeadlineWrap = document.getElementById("revive-deadline-wrap");
  const reviveError = document.getElementById("revive-error");
  const growthModal = document.getElementById("growth-modal");
  const growthReveal = document.getElementById("growth-reveal");
  const growthTitle = document.getElementById("growth-title");
  const growthCopy = document.getElementById("growth-copy");

  // Remember whether the pet was alive at the last render so a death pops the revive modal once.
  let wasAlive = null;
  let screen = null;
  // Species with ASCII art draw as colored text; the rest keep their SVG art for now.
  let textScreen = null;
  let feedBtn = null;
  let playBtn = null;
  let spendBtn = null;

  /** The name arc fits about 330 units of text; longer names shrink from the full size to fit. */
  const NAME_FONT = 75;
  const NAME_ROOM = 330;
  function fitTitleName() {
    const text = titleName.parentNode;
    text.style.fontSize = "";
    const len = text.getComputedTextLength();
    if (len > NAME_ROOM) text.style.fontSize = (NAME_FONT * NAME_ROOM / len) + "px";
  }
  if (document.fonts) document.fonts.ready.then(fitTitleName);

  function truncate(s, max) {
    return s.length > max ? s.slice(0, max - 1).trimEnd() + "\u2026" : s;
  }

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  function currentPet() {
    return KipStorage.findPet(KipStorage.load(), petId);
  }

  function openModal(el) { el.hidden = false; }
  function closeModal(el) { el.hidden = true; }

  document.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      closeModal(document.getElementById(btn.getAttribute("data-close")));
    });
  });
  document.querySelectorAll(".modal").forEach(function (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.hidden = true;
    });
  });

  /** Build the device once; later renders only refresh its screen so the buttons keep their listeners. */
  function buildDevice(pet) {
    deviceHost.innerHTML = KipDevice.markup(pet.device, {
      buttons: [
        { id: "btn-feed", label: "Feed", ariaLabel: "Feed by logging money in" },
        { id: "btn-play", label: "Play", ariaLabel: "Play" },
        { id: "btn-spend", label: "Spend", ariaLabel: "Log money out" }
      ]
    });
    screen = deviceHost.querySelector(".device-screen");
    feedBtn = document.getElementById("btn-feed");
    playBtn = document.getElementById("btn-play");
    spendBtn = document.getElementById("btn-spend");
    feedBtn.addEventListener("click", function () { openMoney("in"); });
    spendBtn.addEventListener("click", function () { openMoney("out"); });
    playBtn.addEventListener("click", function () {
      const live = currentPet();
      if (!live || !live.creature.alive) return;
      celebrate("play");
    });

    // Tint the page with the device's colors.
    const c = KipDevice.COLORWAYS[KipDevice.resolve(pet.device).colorway];
    document.body.style.setProperty("--page", "color-mix(in srgb, " + c.shell + " 24%, #fffaf0)");
    document.body.style.setProperty("--dot-a", "color-mix(in srgb, " + c.shell + " 45%, #ffffff)");
    document.body.style.setProperty("--dot-b", "color-mix(in srgb, " + c.button + " 40%, #ffffff)");
  }

  function describeDaysLeft(pet) {
    const days = KipFinance.daysLeft(pet);
    const date = KipFinance.formatDate(pet.goal.deadline);
    if (days <= 0) return "Due " + date + " (passed)";
    if (days < 1) return "Due " + date + " (today)";
    const whole = Math.floor(days);
    return "Due " + date + " (in " + whole + (whole === 1 ? " day)" : " days)");
  }

  function renderJournal(pet) {
    const alive = pet.creature.alive;
    journalList.innerHTML = "";
    if (!pet.transactions.length) {
      const empty = document.createElement("li");
      empty.className = "entry-empty";
      empty.textContent = "Nothing has been logged yet.";
      journalList.appendChild(empty);
      return;
    }
    pet.transactions.slice().reverse().forEach(function (item) {
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
        KipCreature.removeTransaction(petId, item.id);
        render();
      });

      li.appendChild(meta);
      li.appendChild(amount);
      li.appendChild(remove);
      journalList.appendChild(li);
    });
  }

  function render() {
    const pet = KipStorage.findPet(KipCreature.sync(), petId);
    if (!pet) {
      window.location.replace("index.html");
      return;
    }
    if (!screen) buildDevice(pet);
    const c = pet.creature;
    const species = KipStorage.getSpecies(pet.speciesId);
    const complete = KipCreature.isComplete(pet);
    const alive = c.alive;

    document.title = pet.petName;
    document.querySelectorAll("[data-revive-label]").forEach(function (el) { el.textContent = "Revive " + pet.petName; });
    if (KipScreen.supports(pet)) {
      if (textScreen) textScreen.update(pet);
      else textScreen = KipScreen.mount(screen, pet);
    } else {
      screen.innerHTML = KipDevice.screenMarkup(pet);
    }
    petNameDisplay.textContent = pet.petName + ", saving for " + pet.goal.label;
    if (titleName.textContent !== pet.petName) {
      titleName.textContent = pet.petName;
      fitTitleName();
    }
    titleGoal.textContent = "Saving for " + truncate(pet.goal.label, 30);
    speciesLabel.textContent = (alive ? capitalize(c.age) + " " : "") + species.label;

    goalSaved.textContent = KipFinance.formatMoney(KipFinance.saved(pet));
    goalTarget.textContent = KipFinance.formatMoney(pet.goal.target);
    xpFill.style.width = Math.round(KipFinance.progress(pet) * 100) + "%";
    goalDeadline.textContent = complete ? "This goal is fully saved." : describeDaysLeft(pet);

    const full = Math.round(c.fullness);
    fullnessFill.style.width = full + "%";
    fullnessFill.classList.toggle("is-low", full < 25);
    fullnessText.textContent = full;
    mealHint.textContent = !alive ? ""
      : complete ? pet.petName + " is all grown up and never hungry again."
      : KipCreature.statusLine(pet);
    reviveCount.textContent = c.revives || 0;

    reviveActions.hidden = alive;
    completeActions.hidden = !complete;
    feedBtn.disabled = !alive || complete;
    playBtn.disabled = !alive;
    spendBtn.disabled = !alive;
    if (!alive) closeModal(moneyModal);

    renderJournal(pet);

    if (wasAlive === true && !alive) showRevive();
    wasAlive = alive;
  }

  function celebrate(action) {
    if (textScreen) {
      textScreen.act(action);
      return;
    }
    const wrap = screen.querySelector(".lcd-pet");
    if (!wrap) return;
    wrap.classList.add("is-happy", "care-" + action);
    window.setTimeout(function () {
      wrap.classList.remove("is-happy", "care-" + action);
    }, 1000);
  }

  function showGrowth(pet, completed) {
    growthTitle.textContent = completed
      ? pet.petName + " reached their final form"
      : pet.petName + " evolved into a " + pet.creature.age;
    growthReveal.innerHTML = KipCreature.petSvgMarkup(pet, "creature growth-creature");
    growthCopy.textContent = completed
      ? "You saved the full " + KipFinance.formatMoney(pet.goal.target) + " for " + pet.goal.label + "."
      : "You have saved half of the money for " + pet.goal.label + ".";
    window.setTimeout(function () { openModal(growthModal); }, 450);
  }

  function showRevive() {
    const pet = currentPet();
    const expired = KipFinance.daysLeft(pet) <= 0;
    reviveTitle.textContent = pet.petName + " has passed away";
    revivePortrait.innerHTML = KipCreature.petSvgMarkup(pet, "creature growth-creature");
    reviveCopy.textContent = pet.creature.deathReason === "deadline"
      ? "The deadline arrived before " + pet.goal.label + " was fully saved, so choose a new deadline to bring " + pet.petName + " back."
      : pet.petName + " went hungry for too long.";
    reviveDeadlineWrap.hidden = !expired;
    reviveForm.deadline.min = KipFinance.todayIso(1);
    reviveForm.deadline.value = "";
    reviveError.textContent = "";
    openModal(reviveModal);
  }

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

  function openMoney(which) {
    switchTab(which);
    openModal(moneyModal);
    (which === "in" ? formIn : formOut).label.focus();
  }

  function submitMoney(form, type) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      const label = form.label.value.trim();
      const amount = Math.round(Number(form.amount.value) * 100) / 100;
      if (!label || !(amount > 0)) return;
      const result = KipCreature.logMoney(petId, type, label, amount);
      closeModal(moneyModal);
      if (!result.ok) {
        render();
        return;
      }
      const pet = currentPet();
      form.reset();
      if (type === "in") {
        feedback.textContent = result.fed
          ? pet.petName + " ate after you logged " + KipFinance.formatMoney(amount) + " in."
          : "You logged " + KipFinance.formatMoney(amount) + " in.";
      } else {
        feedback.textContent = "You logged " + KipFinance.formatMoney(amount) + " out.";
      }
      render();
      if (type === "in" && result.fed) celebrate("feed");
      if (result.grew || result.completed) showGrowth(pet, result.completed);
    });
  }
  submitMoney(formIn, "in");
  submitMoney(formOut, "out");

  document.getElementById("open-revive").addEventListener("click", showRevive);

  reviveForm.addEventListener("submit", function (e) {
    e.preventDefault();
    const deadline = reviveForm.deadline.value;
    if (!reviveDeadlineWrap.hidden && (!deadline || deadline <= KipFinance.todayIso())) {
      reviveError.textContent = "Pick a new deadline after today.";
      return;
    }
    const result = KipCreature.revive(petId, deadline);
    if (!result.ok) {
      reviveError.textContent = "That deadline didn't work, so please try a later date.";
      return;
    }
    closeModal(reviveModal);
    const pet = currentPet();
    feedback.textContent = pet.petName + " has been revived.";
    render();
    celebrate("feed");
    if (result.grew || result.completed) showGrowth(pet, result.completed);
  });

  document.getElementById("release-btn").addEventListener("click", function () {
    if (!window.confirm("Move this pet to the Memory Box?")) return;
    KipCreature.retire(petId);
    window.location.href = "index.html";
  });

  document.getElementById("new-goal-btn").addEventListener("click", function () {
    KipCreature.retire(petId);
    window.location.href = "index.html?new=1";
  });

  render();
  if (!currentPet().creature.alive) showRevive();
  window.setInterval(render, 60000);
})();
