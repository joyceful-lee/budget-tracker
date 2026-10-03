(function () {
  KipCreature.applyBrand();

  const balanceEl = document.getElementById("current-balance");
  const balanceSummary = document.getElementById("balance-summary");
  const coinField = document.getElementById("coin-field");
  const listIn = document.getElementById("list-money-in");
  const listOut = document.getElementById("list-money-out");
  const listCharges = document.getElementById("list-charges");
  const stickyNotes = document.getElementById("sticky-notes");
  const chargesNote = document.getElementById("charges-note");
  const goalLabel = document.getElementById("goal-label");
  const goalAmounts = document.getElementById("goal-amounts");
  const jarFill = document.getElementById("jar-fill");
  const goalProgressLabel = document.getElementById("goal-progress-label");
  const formIn = document.getElementById("form-money-in");
  const formOut = document.getElementById("form-money-out");
  const formGoal = document.getElementById("form-goal");
  const formSavingsDeposit = document.getElementById("form-savings-deposit");
  const formCharge = document.getElementById("form-charge");
  const vibeFill = document.getElementById("vibe-fill");
  const vibeScore = document.getElementById("vibe-score-num");
  const vibeLabel = document.getElementById("vibe-label");
  const vibeSky = document.getElementById("vibe-sky");
  const vibeSun = document.getElementById("vibe-sun");
  const vibeChips = document.getElementById("vibe-chips");
  const vibeCard = document.getElementById("vibe-card");
  const chargeModalTitle = document.getElementById("charge-modal-title");
  const chargeSubmit = document.getElementById("charge-submit");
  const openSavingsDeposit = document.getElementById("open-savings-deposit");
  const chargeRecurring = document.getElementById("charge-recurring");
  const chargeFrequencyWrap = document.getElementById("charge-frequency-wrap");
  let editingChargeId = null;
  let coinMotion = "";
  let lastCoinCount = null;

  function todayIso() {
    return new Date().toISOString().slice(0, 10);
  }

  function openModal(id) {
    document.getElementById(id).hidden = false;
  }

  function closeModal(id) {
    document.getElementById(id).hidden = true;
  }

  document.querySelectorAll("[data-close]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      closeModal(btn.getAttribute("data-close"));
    });
  });

  document.querySelectorAll(".modal").forEach(function (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.hidden = true;
    });
  });

  document.getElementById("open-money").addEventListener("click", function () {
    openModal("money-modal");
  });
  document.getElementById("open-goal").addEventListener("click", function () {
    const data = KipStorage.load();
    if (data.savingsGoal) {
      formGoal.label.value = data.savingsGoal.label;
      formGoal.target.value = data.savingsGoal.target;
      formGoal.current.value = data.savingsGoal.current;
    }
    formSavingsDeposit.hidden = !data.savingsGoal;
    openModal("goal-modal");
  });
  document.getElementById("open-charge").addEventListener("click", function () {
    editingChargeId = null;
    formCharge.reset();
    chargeModalTitle.textContent = "Pin an upcoming charge";
    chargeSubmit.textContent = "Pin to board";
    chargeFrequencyWrap.hidden = true;
    openModal("charge-modal");
  });
  openSavingsDeposit.addEventListener("click", function () {
    const data = KipStorage.load();
    if (!data.savingsGoal) {
      formSavingsDeposit.hidden = true;
      openModal("goal-modal");
      formGoal.label.focus();
      return;
    }
    formGoal.label.value = data.savingsGoal.label;
    formGoal.target.value = data.savingsGoal.target;
    formGoal.current.value = data.savingsGoal.current;
    formSavingsDeposit.hidden = false;
    openModal("goal-modal");
    formSavingsDeposit.amount.focus();
  });

  function removeCharge(id) {
    KipStorage.update(function (data) {
      data.upcoming = data.upcoming.filter(function (charge) { return charge.id !== id; });
    });
    if (editingChargeId === id) editingChargeId = null;
    render();
  }

  function editCharge(item) {
    editingChargeId = item.id;
    formCharge.label.value = item.label;
    formCharge.amount.value = item.amount;
    formCharge.dueDate.value = item.dueDate;
    formCharge.recurring.checked = !!item.recurring;
    formCharge.frequency.value = item.frequency || "monthly";
    chargeFrequencyWrap.hidden = !item.recurring;
    chargeModalTitle.textContent = "Edit pinned charge";
    chargeSubmit.textContent = "Save changes";
    openModal("charge-modal");
  }

  document.querySelectorAll(".tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      const which = tab.getAttribute("data-tab");
      document.querySelectorAll(".tab").forEach(function (t) {
        t.classList.toggle("is-active", t === tab);
      });
      document.querySelectorAll(".tab-panel").forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-panel") !== which;
      });
    });
  });
  chargeRecurring.addEventListener("change", function () {
    chargeFrequencyWrap.hidden = !chargeRecurring.checked;
  });

  function renderList(container, items, type) {
    container.innerHTML = "";
    if (!items.length) {
      const empty = document.createElement("li");
      empty.textContent = "Nothing here yet.";
      empty.style.fontWeight = "600";
      empty.style.color = "var(--muted)";
      container.appendChild(empty);
      return;
    }

    items
      .slice()
      .sort(function (a, b) {
        return (b.date || b.dueDate || "").localeCompare(a.date || a.dueDate || "");
      })
      .forEach(function (item) {
        const li = document.createElement("li");
        const meta = document.createElement("div");
        meta.className = "entry-meta";
        const title = document.createElement("span");
        title.textContent = item.label;
        const date = document.createElement("span");
        date.className = "entry-date";
        date.textContent = KipFinance.formatDate(item.date || item.dueDate);
        meta.appendChild(title);
        meta.appendChild(date);

        const amount = document.createElement("span");
        amount.className = "entry-amount" + (type === "out" || type === "charge" ? " out" : "");
        amount.textContent = KipFinance.formatMoney(item.amount);

        const actions = document.createElement("div");
        actions.className = "entry-actions";
        if (type === "charge") {
          const edit = document.createElement("button");
          edit.type = "button";
          edit.className = "btn-edit";
          edit.textContent = "Edit";
          edit.addEventListener("click", function () { editCharge(item); });
          actions.appendChild(edit);
        }
        const remove = document.createElement("button");
        remove.type = "button";
        remove.className = "btn-remove";
        remove.textContent = "Remove";
        remove.addEventListener("click", function () {
          if (type === "charge") {
            removeCharge(item.id);
          } else {
            KipStorage.update(function (data) {
              data.transactions = data.transactions.filter(function (t) { return t.id !== item.id; });
            });
            render();
          }
        });
        actions.appendChild(remove);

        li.appendChild(meta);
        li.appendChild(amount);
        li.appendChild(actions);
        container.appendChild(li);
      });
  }

  function renderCoins(bal) {
    coinField.innerHTML = "";
    coinField.className = "coin-field" + (coinMotion ? " coins-" + coinMotion : "");
    const stableCount = KipFinance.coinCount(bal);
    const count = stableCount + (coinMotion === "out" ? 3 : 0);
    for (var i = 0; i < count; i++) {
      const coin = document.createElement("span");
      coin.className = "vis-coin";
      if (coinMotion === "in" && lastCoinCount !== null && i >= lastCoinCount) coin.classList.add("is-new");
      if (coinMotion === "out" && i >= stableCount) coin.classList.add("is-leaving");
      coin.style.setProperty("--stack-y", (i * 8) + "px");
      coin.style.setProperty("--coin-wobble", ((i % 3) - 1) * 4 + "px");
      coin.style.animationDelay = (i * 0.06) + "s";
      coinField.appendChild(coin);
    }
    lastCoinCount = stableCount;
    coinMotion = "";
  }

  function renderStickies(data) {
    stickyNotes.innerHTML = "";
    if (!data.upcoming.length) {
      const li = document.createElement("li");
      li.className = "sticky empty";
      li.textContent = "No pins yet";
      stickyNotes.appendChild(li);
      return;
    }
    data.upcoming.forEach(function (item, index) {
      const li = document.createElement("li");
      li.className = "sticky";
      if (item.recurring) li.classList.add("is-recurring");
      li.style.setProperty("--rot", ((index % 3) - 1) * 3 + "deg");
      li.innerHTML =
        "<strong>" + item.label + "</strong>" +
        "<span>" + KipFinance.formatMoney(item.amount) + "</span>" +
        "<span class='entry-date'>" + KipFinance.formatDate(item.dueDate) + (item.recurring ? " · " + item.frequency : "") + "</span>";
      const controls = document.createElement("span");
      controls.className = "sticky-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", function () { editCharge(item); });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", "Remove " + item.label);
      remove.addEventListener("click", function () { removeCharge(item.id); });
      controls.appendChild(edit);
      controls.appendChild(remove);
      li.appendChild(controls);
      stickyNotes.appendChild(li);
    });
  }

  function renderVibe(data) {
    const score = KipFinance.healthScore(data);
    const label = KipFinance.healthLabel(score);
    vibeFill.style.width = score + "%";
    vibeScore.textContent = score;
    vibeLabel.textContent = label;
    const theme = score >= 70 ? "sunny" : score >= 40 ? "mild" : "stormy";
    vibeSky.className = "vibe-sky vibe-" + theme;
    vibeCard.className = "vibe-card vibe-theme-" + theme;
    vibeSun.style.transform = "translateY(" + (30 - score * 0.28) + "px)";

    const chips = [];
    const bal = KipFinance.balance(data);
    const progress = KipFinance.savingsProgress(data);
    const upcoming = KipFinance.upcomingTotal(data);

    chips.push(bal >= 0 ? "Pocket steady" : "Pocket below zero");
    if (progress !== null) chips.push("Goal " + Math.round(progress * 100) + "%");
    else chips.push("No goal yet");
    if (data.upcoming.length) {
      chips.push(bal >= upcoming ? "Charges covered" : "Charges need more");
    } else {
      chips.push("No pins yet");
    }

    vibeChips.innerHTML = chips.map(function (c) {
      return "<li>" + c + "</li>";
    }).join("");
  }

  function render() {
    const data = KipStorage.update(function (current) {
      const today = todayIso();
      current.upcoming.forEach(function (item) {
        if (!item.recurring || !item.dueDate) return;
        let next = new Date(item.dueDate + "T12:00:00");
        while (next.toISOString().slice(0, 10) < today) {
          if (item.frequency === "weekly") next.setDate(next.getDate() + 7);
          else if (item.frequency === "yearly") next.setFullYear(next.getFullYear() + 1);
          else next.setMonth(next.getMonth() + 1);
        }
        item.dueDate = next.toISOString().slice(0, 10);
      });
    });
    const bal = KipFinance.balance(data);
    const income = KipFinance.moneyIn(data);
    const spent = KipFinance.moneyOut(data);

    balanceEl.textContent = KipFinance.formatMoney(bal);
    balanceSummary.textContent =
      "In " + KipFinance.formatMoney(income) + " · Out " + KipFinance.formatMoney(spent);
    renderCoins(bal);

    const progress = KipFinance.savingsProgress(data);
    if (data.savingsGoal) {
      goalLabel.textContent = data.savingsGoal.label;
      goalAmounts.textContent =
        KipFinance.formatMoney(data.savingsGoal.current) +
        " / " +
        KipFinance.formatMoney(data.savingsGoal.target);
      jarFill.style.height = Math.round((progress || 0) * 100) + "%";
      goalProgressLabel.textContent = Math.round((progress || 0) * 100) + "% of your dream saved";
      openSavingsDeposit.textContent = "Add to savings";
    } else {
      goalLabel.textContent = "No savings goal yet";
      goalAmounts.textContent = "";
      jarFill.style.height = "0%";
      goalProgressLabel.textContent = "Ready for a dream";
      openSavingsDeposit.textContent = "Add to savings";
    }

    renderStickies(data);
    renderList(listIn, data.transactions.filter(function (t) { return t.type === "in"; }), "in");
    renderList(listOut, data.transactions.filter(function (t) { return t.type === "out"; }), "out");
    renderList(listCharges, data.upcoming, "charge");
    renderVibe(data);

    const upcoming = KipFinance.upcomingTotal(data);
    if (!data.upcoming.length) {
      chargesNote.textContent = "Pin charges so surprises shrink.";
    } else if (bal >= upcoming) {
      chargesNote.textContent = "Your pocket covers " + KipFinance.formatMoney(upcoming) + " coming up.";
    } else {
      chargesNote.textContent =
        "Need " + KipFinance.formatMoney(upcoming - bal) + " more to cover pins.";
    }
  }

  formIn.addEventListener("submit", function (e) {
    e.preventDefault();
    const label = formIn.label.value.trim();
    const amount = Number(formIn.amount.value);
    if (!label || !(amount > 0)) return;
    KipStorage.update(function (data) {
      data.transactions.push({
        id: KipStorage.uid(),
        type: "in",
        label: label,
        amount: amount,
        date: todayIso()
      });
    });
    formIn.reset();
    coinMotion = "in";
    render();
  });

  formOut.addEventListener("submit", function (e) {
    e.preventDefault();
    const label = formOut.label.value.trim();
    const amount = Number(formOut.amount.value);
    if (!label || !(amount > 0)) return;
    KipStorage.update(function (data) {
      data.transactions.push({
        id: KipStorage.uid(),
        type: "out",
        label: label,
        amount: amount,
        date: todayIso()
      });
    });
    formOut.reset();
    coinMotion = "out";
    render();
  });

  formGoal.addEventListener("submit", function (e) {
    e.preventDefault();
    const label = formGoal.label.value.trim();
    const target = Number(formGoal.target.value);
    const current = Number(formGoal.current.value);
    if (!label || !(target > 0) || current < 0) return;
    KipStorage.update(function (data) {
      data.savingsGoal = {
        label: label,
        target: target,
        current: Math.min(current, target * 10)
      };
    });
    closeModal("goal-modal");
    render();
  });

  formSavingsDeposit.addEventListener("submit", function (e) {
    e.preventDefault();
    const amount = Number(formSavingsDeposit.amount.value);
    const data = KipStorage.load();
    const balance = KipFinance.balance(data);
    if (!(amount > 0) || !data.savingsGoal || amount > balance) {
      formSavingsDeposit.amount.setCustomValidity(amount > balance ? "Your pocket does not have that much available." : "Enter an amount to save.");
      formSavingsDeposit.amount.reportValidity();
      return;
    }
    formSavingsDeposit.amount.setCustomValidity("");
    KipStorage.update(function (next) {
      next.savingsGoal.current += amount;
      next.transactions.push({ id: KipStorage.uid(), type: "out", label: "Moved to savings: " + next.savingsGoal.label, amount: amount, date: todayIso() });
    });
    formSavingsDeposit.reset();
    closeModal("goal-modal");
    render();
  });

  formCharge.addEventListener("submit", function (e) {
    e.preventDefault();
    const label = formCharge.label.value.trim();
    const amount = Number(formCharge.amount.value);
    const dueDate = formCharge.dueDate.value;
    const recurring = formCharge.recurring.checked;
    const frequency = recurring ? formCharge.frequency.value : "";
    if (!label || !(amount > 0) || !dueDate) return;
    KipStorage.update(function (data) {
      if (editingChargeId) {
        const existing = data.upcoming.find(function (item) { return item.id === editingChargeId; });
        if (existing) {
          existing.label = label;
          existing.amount = amount;
          existing.dueDate = dueDate;
          existing.recurring = recurring;
          existing.frequency = frequency;
        }
      } else {
        data.upcoming.push({
          id: KipStorage.uid(),
          label: label,
          amount: amount,
          dueDate: dueDate
          , recurring: recurring
          , frequency: frequency
        });
      }
    });
    editingChargeId = null;
    formCharge.reset();
    chargeModalTitle.textContent = "Pin an upcoming charge";
    chargeSubmit.textContent = "Pin to board";
    closeModal("charge-modal");
    render();
  });

  const dateInput = formCharge.querySelector('input[name="dueDate"]');
  if (dateInput) dateInput.min = todayIso();

  render();
})();
