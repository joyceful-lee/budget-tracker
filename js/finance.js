const KipFinance = (function () {
  function moneyIn(data) {
    return data.transactions
      .filter(function (t) { return t.type === "in"; })
      .reduce(function (sum, t) { return sum + Number(t.amount); }, 0);
  }

  function moneyOut(data) {
    return data.transactions
      .filter(function (t) { return t.type === "out"; })
      .reduce(function (sum, t) { return sum + Number(t.amount); }, 0);
  }

  function balance(data) {
    return moneyIn(data) - moneyOut(data);
  }

  function upcomingTotal(data) {
    return data.upcoming.reduce(function (sum, c) {
      return sum + Number(c.amount);
    }, 0);
  }

  function savingsProgress(data) {
    if (!data.savingsGoal || !data.savingsGoal.target) return null;
    const target = Number(data.savingsGoal.target);
    const current = Number(data.savingsGoal.current);
    if (target <= 0) return null;
    return Math.max(0, Math.min(1, current / target));
  }

  function formatMoney(value) {
    const n = Number(value) || 0;
    const sign = n < 0 ? "-" : "";
    return sign + "$" + Math.abs(n).toFixed(2);
  }

  function formatDate(iso) {
    if (!iso) return "";
    const parts = iso.split("-");
    if (parts.length !== 3) return iso;
    return parts[1] + "/" + parts[2] + "/" + parts[0];
  }

  function healthScore(data) {
    const bal = balance(data);
    const income = moneyIn(data);
    const spent = moneyOut(data);
    const upcoming = upcomingTotal(data);
    const progress = savingsProgress(data);

    let score = 40;

    if (income > 0 || spent > 0 || data.savingsGoal || data.upcoming.length) {
      score = 45;
    }

    if (bal >= 20) score += 18;
    else if (bal >= 5) score += 12;
    else if (bal >= 0) score += 6;
    else score -= 12;

    if (income > 0) {
      const spendRatio = spent / income;
      if (spendRatio <= 0.5) score += 16;
      else if (spendRatio <= 0.75) score += 10;
      else if (spendRatio <= 1) score += 4;
      else score -= 8;
    }

    if (progress !== null) score += Math.round(progress * 18);
    else score -= 2;

    if (data.upcoming.length) {
      if (bal >= upcoming) score += 14;
      else if (bal >= upcoming * 0.5) score += 6;
      else score -= 10;
    } else {
      score += 4;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  function healthLabel(score) {
    if (score >= 80) return "Sunny nest";
    if (score >= 60) return "Steady nest";
    if (score >= 40) return "Growing nest";
    if (score >= 20) return "Drafty nest";
    return "Shaky nest";
  }

  function healthBlurb(data) {
    const score = healthScore(data);
    const bal = balance(data);
    const upcoming = upcomingTotal(data);
    const progress = savingsProgress(data);
    const name = data.petName || "your pet";
    const bits = [];

    bits.push("Nest vibe: " + score + " (" + healthLabel(score) + ").");

    if (bal < 0) bits.push("Your pocket is below zero, so " + name + " feels a chill.");
    else if (bal === 0) bits.push("Your pocket is even. Add money in or trim spending to warm the nest.");
    else bits.push("You have " + formatMoney(bal) + " in your pocket.");

    if (progress !== null) bits.push("Savings goal is " + Math.round(progress * 100) + "% of the way there.");
    else bits.push("Set a savings goal so " + name + " can cheer for something big.");

    if (data.upcoming.length) {
      if (bal >= upcoming) bits.push("You can cover upcoming charges totaling " + formatMoney(upcoming) + ".");
      else bits.push("Upcoming charges total " + formatMoney(upcoming) + ", more than your pocket holds.");
    }

    bits.push("Better journal health earns nest tokens for care.");
    return bits.join(" ");
  }

  function tokenGrantFromHealth(score) {
    if (score >= 80) return 2;
    if (score >= 60) return 1;
    return 0;
  }

  /** How many coin circles to show for a kid-friendly pocket visual. */
  function coinCount(balanceValue) {
    if (balanceValue <= 0) return 0;
    if (balanceValue < 5) return 1;
    if (balanceValue < 15) return 3;
    if (balanceValue < 30) return 5;
    if (balanceValue < 50) return 7;
    return 9;
  }

  return {
    moneyIn,
    moneyOut,
    balance,
    upcomingTotal,
    savingsProgress,
    formatMoney,
    formatDate,
    healthScore,
    healthLabel,
    healthBlurb,
    tokenGrantFromHealth,
    coinCount
  };
})();
