const KipFinance = (function () {
  const DAY_MS = 86400000;

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

  /** Money counted toward the goal. This is the pet's XP; money out is only journaled and never lowers it. */
  function saved(data) {
    return moneyIn(data);
  }

  function progress(data) {
    if (!data.goal || !(data.goal.target > 0)) return 0;
    return Math.max(0, Math.min(1, saved(data) / data.goal.target));
  }

  function remaining(data) {
    if (!data.goal) return 0;
    return Math.max(0, data.goal.target - saved(data));
  }

  /** The goal is due at the very end of its deadline day, local time. */
  function deadlineEnd(goal) {
    return new Date(goal.deadline + "T23:59:59").getTime();
  }

  function daysLeft(data, now) {
    if (!data.goal) return 0;
    return (deadlineEnd(data.goal) - (now || Date.now())) / DAY_MS;
  }

  /** A full belly empties in 1–3 days; tighter deadlines make the pet hungrier faster. */
  function hoursToEmpty(data, now) {
    return Math.max(24, Math.min(72, daysLeft(data, now) * 2));
  }

  /** The amount that fills the pet from empty: what you need to save per hunger cycle to stay on pace. */
  function fullMeal(data) {
    const perDay = remaining(data) / Math.max(1, daysLeft(data));
    return Math.max(1, perDay * hoursToEmpty(data) / 24);
  }

  /** Fullness points a deposit restores. Any deposit counts for at least a snack. */
  function feedPoints(data, amount) {
    return Math.max(15, Math.min(100, Math.round(100 * amount / fullMeal(data))));
  }

  function formatMoney(value) {
    const n = Number(value) || 0;
    const sign = n < 0 ? "-" : "";
    return sign + "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDate(iso) {
    if (!iso) return "";
    const d = new Date(iso + "T12:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  }

  function todayIso(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + (offsetDays || 0));
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }

  return {
    DAY_MS,
    moneyIn,
    moneyOut,
    saved,
    progress,
    remaining,
    deadlineEnd,
    daysLeft,
    hoursToEmpty,
    fullMeal,
    feedPoints,
    formatMoney,
    formatDate,
    todayIso
  };
})();
