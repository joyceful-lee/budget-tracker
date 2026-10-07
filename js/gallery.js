(function () {
  const grid = document.getElementById("nestie-grid");
  const onboardModal = document.getElementById("onboard-modal");
  const onboardForm = document.getElementById("onboard-form");
  const onboardClose = document.getElementById("onboard-close");
  const onboardError = document.getElementById("onboard-error");
  const deviceChoices = document.getElementById("device-choices");
  const hatchBtn = document.getElementById("hatch-btn");
  const hatchOverlay = document.getElementById("hatch-overlay");
  const hatchDevice = document.getElementById("hatch-device");
  const hatchText = document.getElementById("hatch-text");
  const memoryModal = document.getElementById("memory-modal");
  const memoryGrid = document.getElementById("memory-grid");

  const PLUS_ICON = '<span class="icon" aria-hidden="true">add</span>';
  let choices = [];
  let selectedDevice = null;

  function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  document.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      document.getElementById(btn.getAttribute("data-close")).hidden = true;
    });
  });
  document.querySelectorAll(".modal").forEach(function (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal && !onboardClose.hidden) modal.hidden = true;
    });
  });

  function nestieCard(pet) {
    const card = document.createElement("a");
    card.className = "nestie-card" + (pet.creature.alive ? "" : " is-dead");
    // The name plate takes its device's colors.
    const colors = KipDevice.COLORWAYS[KipDevice.resolve(pet.device).colorway];
    card.style.setProperty("--card-tint", colors.shell);
    card.style.setProperty("--card-accent", colors.button);
    card.href = "pet.html?id=" + encodeURIComponent(pet.id);
    card.innerHTML = KipDevice.markup(pet.device, { screen: KipDevice.screenMarkup(pet) }) +
      '<div class="nestie-plate panel"><h2 class="nestie-name"></h2><p class="nestie-goal"></p>' +
      '<div class="mini-xp"><span></span></div><p class="nestie-status"></p></div>';
    card.querySelector(".nestie-name").textContent = pet.petName;
    card.querySelector(".nestie-goal").textContent = "Saving for " + pet.goal.label;
    card.querySelector(".mini-xp span").style.width = Math.round(KipFinance.progress(pet) * 100) + "%";
    card.querySelector(".nestie-status").textContent = KipCreature.statusLine(pet);
    card.setAttribute("aria-label", pet.petName + ", saving for " + pet.goal.label);
    return card;
  }

  function render() {
    const data = KipCreature.sync();
    grid.innerHTML = "";
    data.pets.forEach(function (pet) { grid.appendChild(nestieCard(pet)); });

    const add = document.createElement("button");
    add.type = "button";
    add.className = "nestie-new";
    add.innerHTML = '<span class="nestie-new-shape">' + PLUS_ICON + '</span><span class="btn btn-sun">New ' + KipDevice.NAME + "</span>";
    add.addEventListener("click", function () { showOnboarding(true); });
    grid.appendChild(add);
  }

  function renderChoices() {
    deviceChoices.innerHTML = "";
    choices.forEach(function (device, i) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "device-choice" + (selectedDevice === device ? " is-selected" : "");
      btn.setAttribute("role", "option");
      btn.setAttribute("aria-selected", selectedDevice === device ? "true" : "false");
      btn.setAttribute("aria-label", KipDevice.describe(device));
      btn.innerHTML = KipDevice.markup(device, { screen: KipDevice.screenMarkup(null, { egg: true, device: device }) });
      btn.addEventListener("click", function () {
        selectedDevice = choices[i];
        onboardError.textContent = "";
        renderChoices();
      });
      deviceChoices.appendChild(btn);
    });
  }

  function rollChoices() {
    const seen = {};
    choices = [];
    while (choices.length < 3) {
      const d = KipDevice.randomDevice();
      const key = d.shape + d.colorway;
      if (seen[key]) continue;
      seen[key] = true;
      choices.push(d);
    }
    selectedDevice = null;
    renderChoices();
  }

  function showOnboarding(canClose) {
    onboardForm.reset();
    onboardForm.deadline.min = KipFinance.todayIso(1);
    onboardError.textContent = "";
    onboardClose.hidden = !canClose;
    rollChoices();
    onboardModal.hidden = false;
  }

  document.getElementById("reroll-devices").addEventListener("click", rollChoices);

  function setHatchScreen(html) {
    hatchDevice.querySelector(".device-screen").innerHTML = html;
  }

  function runHatch(petName, device, goal) {
    hatchDevice.innerHTML = KipDevice.markup(device, { screen: KipDevice.screenMarkup(null, { egg: true, eggState: "shaking", device: device }) });
    hatchText.textContent = "The egg is starting to hatch...";
    hatchOverlay.hidden = false;

    window.setTimeout(function () {
      setHatchScreen(KipDevice.screenMarkup(null, { egg: true, eggState: "cracking", device: device }));
      hatchText.textContent = "The shell is cracking open...";
    }, 1300);

    window.setTimeout(function () {
      const id = KipCreature.hatch(petName, device, goal);
      const pet = KipStorage.findPet(KipStorage.load(), id);
      setHatchScreen(KipDevice.screenMarkup(pet));
      hatchDevice.querySelector(".lcd-pet").classList.add("is-happy");
      hatchText.textContent = "Say hello to " + petName + ".";
      window.setTimeout(function () {
        window.location.href = "pet.html?id=" + encodeURIComponent(id);
      }, 1600);
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
    else if (!selectedDevice) error = "Choose a device for your " + KipDevice.NAME + ".";
    if (error) {
      onboardError.textContent = error;
      return;
    }
    onboardModal.hidden = true;
    runHatch(petName, selectedDevice, {
      label: goal,
      target: Math.round(target * 100) / 100,
      deadline: deadline,
      createdAt: Date.now()
    });
  });

  function renderMemories() {
    const data = KipStorage.load();
    memoryGrid.innerHTML = "";

    const history = document.createElement("section");
    history.className = "memory-row";
    history.innerHTML = "<h3>Past Pets</h3>";
    const list = document.createElement("ul");
    list.className = "entry-list";
    if (!data.pastPets.length) {
      list.innerHTML = '<li class="entry-empty">There are no past pets yet.</li>';
    }
    data.pastPets.slice().reverse().forEach(function (pet) {
      const li = document.createElement("li");
      if (pet.device) {
        const mini = document.createElement("div");
        mini.className = "past-device";
        mini.innerHTML = KipDevice.markup(pet.device, {});
        li.appendChild(mini);
      }
      const meta = document.createElement("div");
      meta.className = "entry-meta";
      const name = document.createElement("span");
      name.textContent = pet.petName + ", saving for " + pet.goalLabel;
      const detail = document.createElement("span");
      detail.className = "entry-date";
      detail.textContent = (pet.outcome === "complete" ? "Reached the goal" : "Released early") +
        " and was revived " + pet.revives + (pet.revives === 1 ? " time" : " times");
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
      title.textContent = id === "money" && !elementUnlocked ? "Hidden Creature" : species.label + " (" + species.element + ")";
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
    memoryModal.hidden = false;
  });

  render();
  window.setInterval(render, 60000);

  const data = KipStorage.load();
  const wantsNew = new URLSearchParams(window.location.search).get("new") === "1";
  if (!data.pets.length || wantsNew) showOnboarding(data.pets.length > 0);
  if (wantsNew) window.history.replaceState(null, "", "index.html");
})();
