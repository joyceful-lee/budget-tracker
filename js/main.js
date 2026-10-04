(function () {
  const modal = document.getElementById("onboard-modal");
  const nestLayout = document.getElementById("nest-layout");
  const eggGrid = document.getElementById("egg-grid");
  const nameInput = document.getElementById("pet-name-input");
  const hatchBtn = document.getElementById("hatch-btn");
  const onboardError = document.getElementById("onboard-error");
  const hatchOverlay = document.getElementById("hatch-overlay");
  const hatchEgg = document.getElementById("hatch-egg");
  const hatchText = document.getElementById("hatch-text");
  const wrap = document.getElementById("creature-wrap");
  const host = document.getElementById("creature-svg-host");
  const speechEl = document.getElementById("creature-speech");
  const vitalityText = document.getElementById("vitality-text");
  const tokenCount = document.getElementById("token-count");
  const flowerCount = document.getElementById("flower-count-home");
  const feedback = document.getElementById("care-feedback");
  const petNameDisplay = document.getElementById("pet-name-display");
  const speciesLabel = document.getElementById("pet-species-label");
  const shopList = document.getElementById("shop-list");
  const nestDecor = document.getElementById("nest-decor");
  const nestBed = document.getElementById("nest-bed");
  const shopToggle = document.getElementById("shop-toggle");
  const shopPanel = document.getElementById("shop-panel");
  const shopToggleHint = document.getElementById("shop-toggle-hint");
  const previewBar = document.getElementById("shop-preview-bar");
  const previewLabel = document.getElementById("preview-label");
  const previewBuy = document.getElementById("preview-buy");
  const previewCancel = document.getElementById("preview-cancel");
  const grassField = document.getElementById("grass-field");
  const memoryModal = document.getElementById("memory-modal");
  const memoryGrid = document.getElementById("memory-grid");
  const memoryOpen = document.getElementById("memory-box-open");
  const memoryClose = document.getElementById("memory-close");
  const onboardTitle = document.getElementById("onboard-title");
  const careEffect = document.getElementById("care-effect");
  const nestStage = document.querySelector(".nest-stage");
  const weatherBadge = document.getElementById("home-weather-badge");
  const growthModal = document.getElementById("growth-modal");
  const growthReveal = document.getElementById("growth-reveal");
  const growthTitle = document.getElementById("growth-title");
  const growthCopy = document.getElementById("growth-copy");
  const growthClose = document.getElementById("growth-close");

  const fills = {
    hunger: document.getElementById("fill-hunger"),
    joy: document.getElementById("fill-joy"),
    energy: document.getElementById("fill-energy"),
    tidy: document.getElementById("fill-tidy")
  };
  const labels = {
    hunger: document.getElementById("stat-hunger"),
    joy: document.getElementById("stat-joy"),
    energy: document.getElementById("stat-energy"),
    tidy: document.getElementById("stat-tidy")
  };

  let selectedEgg = null;
  let previewItemId = null;
  let idleTimer = null;

  const IDLE_CLASSES = ["idle-tilt", "idle-stretch", "idle-hop", "idle-wiggle"];

  function setMeter(key, value) {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    fills[key].style.width = v + "%";
    labels[key].textContent = v;
  }

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
      if (!wrap || wrap.closest("[hidden]")) {
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

  function colorForItem(data, item) {
    const defaults = {
      "nest-pillow": "#e6a3b5",
      "nest-lantern": "#f0c15a",
      "nest-bloom": "#f3a7bd",
      "acc-bow": "#e8a08a",
      "acc-scarf": "#6aaa6e",
      "acc-hat": "#b8dff2"
    };
    return (data.cosmeticColors && data.cosmeticColors[item.id]) || defaults[item.id] || "#e0a12a";
  }

  function displayData() {
    const data = KipStorage.load();
    if (!previewItemId) return data;
    const preview = Object.assign({}, data);
    const item = KipStorage.getCosmetic(previewItemId);
    if (!item) return data;
    if (item.type === "nest") preview.equippedNest = item.id;
    else preview.equippedAccessory = item.id;
    return preview;
  }

  function renderNestDecor(data) {
    nestBed.className = "nest-bed";
    nestDecor.innerHTML = "";
    if (data.equippedNest === "nest-pillow") {
      nestBed.classList.add("has-pillow");
      nestDecor.innerHTML = '<span class="decor-pillow" style="--item-color:' + colorForItem(data, KipStorage.getCosmetic("nest-pillow")) + '"></span>';
    } else if (data.equippedNest === "nest-lantern") {
      nestBed.classList.add("has-lantern");
      nestDecor.innerHTML = '<span class="decor-lantern" style="--item-color:' + colorForItem(data, KipStorage.getCosmetic("nest-lantern")) + '"><i class="lantern-star">★</i><i class="lantern-tassel"></i></span>';
    } else if (data.equippedNest === "nest-bloom") {
      nestBed.classList.add("has-bloom");
      const bloomColor = colorForItem(data, KipStorage.getCosmetic("nest-bloom"));
      const bloomPoints = [[4,42],[10,23],[23,9],[40,1],[58,0],[76,8],[89,23],[95,42],[84,62],[65,72],[36,72],[15,62]];
      nestDecor.innerHTML = bloomPoints.map(function (point, index) {
        return '<span class="decor-bloom" style="--item-color:' + bloomColor + ';left:' + point[0] + '%;top:' + point[1] + '%;--bloom-rotate:' + (index * 23) + 'deg"></span>';
      }).join("");
    }
  }

  function renderShop(data) {
    shopList.innerHTML = "";
    KipStorage.COSMETICS.forEach(function (item) {
      const owned = (data.ownedCosmetics || []).indexOf(item.id) !== -1;
      const equipped =
        data.equippedNest === item.id || data.equippedAccessory === item.id;
      const row = document.createElement("div");
      row.className = "shop-item";
      if (previewItemId === item.id) row.classList.add("is-previewing");
      row.innerHTML =
        "<div><strong>" + item.name + "</strong><span>" + item.desc +
        " · +" + item.joyBonus + " joy · " + item.cost + " flowers</span></div>";

      const colorLabel = document.createElement("label");
      colorLabel.className = "shop-color";
      colorLabel.innerHTML = "Color ";
      const colorInput = document.createElement("input");
      colorInput.type = "color";
      colorInput.value = colorForItem(data, item);
      colorInput.setAttribute("aria-label", item.name + " color");
      colorInput.addEventListener("change", function () {
        KipStorage.update(function (d) {
          d.cosmeticColors = d.cosmeticColors || {};
          d.cosmeticColors[item.id] = colorInput.value;
        });
        if (owned || previewItemId === item.id) renderHabitat();
      });
      colorLabel.appendChild(colorInput);
      row.firstElementChild.appendChild(colorLabel);

      const actions = document.createElement("div");
      actions.className = "shop-actions";

      if (!owned) {
        const previewBtn = document.createElement("button");
        previewBtn.type = "button";
        previewBtn.className = "btn btn-soft shop-mini";
        previewBtn.textContent = previewItemId === item.id ? "Previewing" : "Preview";
        previewBtn.disabled = previewItemId === item.id;
        previewBtn.addEventListener("click", function () {
          previewItemId = item.id;
          previewBar.hidden = false;
          previewLabel.textContent = "Previewing " + item.name;
          renderHabitat();
        });
        actions.appendChild(previewBtn);
      } else {
        const wearBtn = document.createElement("button");
        wearBtn.type = "button";
        wearBtn.className = "shelf-btn shop-mini";
        wearBtn.textContent = equipped ? "On" : "Wear";
        wearBtn.disabled = equipped;
        wearBtn.addEventListener("click", function () {
          KipCreature.equipCosmetic(item.id);
          previewItemId = null;
          previewBar.hidden = true;
          feedback.textContent = "Equipped " + item.name + ".";
          renderHabitat();
        });
        actions.appendChild(wearBtn);
      }

      row.appendChild(actions);
      shopList.appendChild(row);
    });
  }

  function renderHabitat() {
    const live = KipCreature.sync();
    if (!live.onboarded) return;
    const data = displayData();

    KipCreature.applyBrand();
    const species = KipStorage.getSpecies(live.speciesId);
    petNameDisplay.textContent = live.petName;
    const age = (live.creature.age || "baby");
    speciesLabel.textContent = age.charAt(0).toUpperCase() + age.slice(1) + " " + species.label + " · " + (species.element || "Friend");
    host.innerHTML = KipCreature.petSvgMarkup(data, "creature");
    renderNestDecor(data);
    renderShop(live);

    const c = live.creature;
    setMeter("hunger", c.hunger);
    setMeter("joy", c.joy);
    setMeter("energy", c.energy);
    setMeter("tidy", c.tidy);

    tokenCount.textContent = live.tokens || 0;
    flowerCount.textContent = live.flowers || 0;
    vitalityText.textContent = KipFinance.healthLabel(KipFinance.healthScore(live));
    const journalVibe = KipFinance.healthScore(live);
    const weather = journalVibe >= 70 ? "sunny" : journalVibe >= 40 ? "cloudy" : "rainy";
    nestStage.classList.remove("weather-sunny", "weather-cloudy", "weather-rainy");
    nestStage.classList.add("weather-" + weather);
    weatherBadge.textContent = weather === "sunny"
      ? "Sunny skies · " + KipFinance.healthLabel(journalVibe)
      : weather === "cloudy"
        ? "Soft clouds · " + KipFinance.healthLabel(journalVibe)
        : "Gentle rain · " + KipFinance.healthLabel(journalVibe);
    speechEl.textContent = KipCreature.speechForState(live);

    const mood = KipCreature.mood(live);
    wrap.classList.remove("is-happy", "is-sad", "is-glowing");
    if (mood === "happy") {
      wrap.classList.add("is-glowing");
    } else if (mood === "sad") {
      wrap.classList.add("is-sad");
    }

    document.querySelectorAll(".orbit-btn").forEach(function (btn) {
      btn.disabled = false;
      btn.title = (live.tokens || 0) < 1 ? "Needs 1 nest token — tap to learn how to earn one" : "Uses 1 nest token";
    });
  }

  function renderMemories() {
    const data = KipStorage.load();
    const ids = ["air", "water", "fire", "earth", "metal", "electric", "dark", "fairy", "money"];
    memoryGrid.innerHTML = "";
    ids.forEach(function (id) {
      const species = KipStorage.getSpecies(id);
      const elementUnlocked = KipCreature.AGE_STAGES.some(function (stage) {
        return !!data.memories[id + ":" + stage];
      });
      const row = document.createElement("section");
      row.className = "memory-row";
      const title = document.createElement("h3");
      title.textContent = id === "money" && !elementUnlocked ? "??? · Hidden creature" : species.element + " · " + species.label;
      row.appendChild(title);
      const stages = document.createElement("div");
      stages.className = "memory-stages";
      KipCreature.AGE_STAGES.forEach(function (stage) {
        const memory = data.memories[id + ":" + stage];
        const card = document.createElement("div");
        card.className = "memory-slot" + (memory ? " is-unlocked" : " is-locked");
        const fake = { speciesId: id, creature: { age: stage }, equippedAccessory: "", cosmeticColors: {} };
        card.innerHTML = '<div class="memory-portrait">' + KipCreature.petSvgMarkup(fake, "creature memory-creature") + '</div>' +
          '<strong>' + stage.charAt(0).toUpperCase() + stage.slice(1) + '</strong>' +
          '<small>' + (memory ? memory.petName : "Locked") + '</small>';
        stages.appendChild(card);
      });
      row.appendChild(stages);
      memoryGrid.appendChild(row);
    });
  }

  shopToggle.addEventListener("click", function () {
    const open = shopPanel.hidden;
    shopPanel.hidden = !open;
    shopToggle.setAttribute("aria-expanded", open ? "true" : "false");
    shopToggleHint.textContent = open ? "Close" : "Open";
  });

  previewBuy.addEventListener("click", function () {
    if (!previewItemId) return;
    const result = KipCreature.buyCosmetic(previewItemId);
    feedback.textContent = result.message;
    if (result.ok) {
      previewItemId = null;
      previewBar.hidden = true;
    }
    renderHabitat();
  });

  previewCancel.addEventListener("click", function () {
    previewItemId = null;
    previewBar.hidden = true;
    renderHabitat();
  });

  function showNest() {
    modal.hidden = true;
    nestLayout.hidden = false;
    buildGrass();
    renderHabitat();
    scheduleIdle();
  }

  function showOnboarding(message) {
    modal.hidden = false;
    nestLayout.hidden = true;
    onboardTitle.textContent = message || "Name your friend and pick a mystery egg";
    nameInput.value = "";
    selectedEgg = null;
    renderEggs();
  }

  function runHatch(petName, eggId) {
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
      KipCreature.hatch(petName, eggId);
      hatchOverlay.hidden = true;
      hatchEgg.classList.remove("is-cracking");
      showNest();
      wrap.classList.add("is-happy");
      feedback.textContent = petName + " hatched! Care buttons use nest tokens.";
      window.setTimeout(function () { wrap.classList.remove("is-happy"); }, 900);
    }, 2000);
  }

  hatchBtn.addEventListener("click", function () {
    const petName = nameInput.value.trim();
    if (!petName) {
      onboardError.textContent = "Give your pet a name first.";
      return;
    }
    if (!selectedEgg) {
      onboardError.textContent = "Pick an egg to hatch.";
      return;
    }
    modal.hidden = true;
    runHatch(petName, selectedEgg);
  });

  document.querySelectorAll(".orbit-btn").forEach(function (btn) {
    btn.addEventListener("click", function () {
      const action = btn.getAttribute("data-care");
      const result = KipCreature.care(action);
      feedback.textContent = result.message;
      if (result.ok) {
        clearIdleClasses();
        wrap.classList.add("is-happy", "care-" + action);
        careEffect.className = "care-effect effect-" + action + " is-active";
        careEffect.textContent = action === "feed" ? "🍓  🍃  ✦" : action === "play" ? "★  ✦  ★" : action === "rest" ? "Z  z  ✦" : "✦  ✧  ✦";
        speechEl.textContent = result.speech;
        window.setTimeout(function () {
          wrap.classList.remove("is-happy", "care-" + action);
          careEffect.className = "care-effect";
        }, 1000);
      }
      renderHabitat();
      if (result.grew) {
        const grown = KipStorage.load();
        const age = grown.creature.age;
        growthTitle.textContent = grown.petName + " grew into a " + age + "!";
        growthReveal.innerHTML = KipCreature.petSvgMarkup(grown, "creature growth-creature");
        growthCopy.textContent = "Their " + age + " form has been saved permanently in the Memory Box.";
        window.setTimeout(function () { growthModal.hidden = false; }, 450);
      }
      if (result.retired) {
        window.setTimeout(function () {
          showOnboarding("A life well lived—meet your next friend");
          onboardError.textContent = "Your retired friend and every growth stage are safe in the Memory Box.";
        }, 900);
      }
    });
  });

  memoryOpen.addEventListener("click", function () {
    renderMemories();
    memoryModal.hidden = false;
  });
  memoryClose.addEventListener("click", function () { memoryModal.hidden = true; });
  growthClose.addEventListener("click", function () { growthModal.hidden = true; });

  const data = KipStorage.load();
  if (!data.onboarded) showOnboarding();
  else showNest();
})();
