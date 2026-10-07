/** Draws the toy device each pet lives in: its shell shape, colorway, pattern, screen and buttons. */
const KipDevice = (function () {
  const NAME = "Nestie";
  const NAME_PLURAL = "Nesties";
  const VIEW_W = 300;
  const VIEW_H = 360;
  const INK = "#2a2140";

  // Keys are stored in saves, so a colorway can be recolored but its key stays.
  /**
   * Shell colors come from the Slicko-8 palette (lospec.com/palette-list/slicko-8); each colorway's
   * pattern and buttons use other colors from the same palette.
   */
  const COLORWAYS = {
    amethyst: { label: "Amethyst", shell: "#8f43c6", shell2: "#8f43c6", accent: "#e8ea60", button: "#4ae3bf", bezel: "#f6fbd9" },
    orchid: { label: "Orchid", shell: "#df4fcd", shell2: "#df4fcd", accent: "#f6fbd9", button: "#e8ea60", bezel: "#f6fbd9" },
    amber: { label: "Amber", shell: "#ed9f2a", shell2: "#ed9f2a", accent: "#f6fbd9", button: "#5d51d7", bezel: "#f6fbd9" },
    lemon: { label: "Lemon", shell: "#e8ea60", shell2: "#e8ea60", accent: "#ed9f2a", button: "#8f43c6", bezel: "#f6fbd9" },
    mint: { label: "Mint", shell: "#4ae3bf", shell2: "#4ae3bf", accent: "#f6fbd9", button: "#df4fcd", bezel: "#f6fbd9" },
    indigo: { label: "Indigo", shell: "#5d51d7", shell2: "#5d51d7", accent: "#4ae3bf", button: "#ed9f2a", bezel: "#f6fbd9" },
    cream: { label: "Cream", shell: "#f6fbd9", shell2: "#f6fbd9", accent: "#df4fcd", button: "#5d51d7", bezel: "#ffffff" },
    slick: { label: "Slick", shell: "#1e1a20", shell2: "#1e1a20", accent: "#8f43c6", button: "#e8ea60", bezel: "#f6fbd9" }
  };
  /** Colorways from older saves map to the closest Slicko-8 colorway. */
  const COLORWAY_ALIASES = {
    bubblegum: "orchid", lagoon: "mint", lemon: "lemon", grape: "amethyst", mint: "mint",
    tangerine: "amber", cherry: "orchid", sky: "indigo", lime: "lemon", midnight: "slick"
  };


  const PATTERNS = ["dots", "stripes", "checks", "stars", "bolts", "waves", "confetti", "sparkles"];
  /** Patterns that were renamed, so older saves keep a matching look. */
  const PATTERN_ALIASES = { hearts: "bolts" };

  function bloomPath() {
    const cx = 150, cy = 200, r = 136, bump = 30, n = 12;
    let d = "";
    for (let i = 0; i <= n; i++) {
      const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
      const x = (cx + r * Math.cos(a)).toFixed(1), y = (cy + r * Math.sin(a)).toFixed(1);
      if (i === 0) {
        d += "M" + x + " " + y;
      } else {
        const m = a - Math.PI / n;
        d += " Q" + (cx + (r + bump) * Math.cos(m)).toFixed(1) + " " + (cy + (r + bump) * Math.sin(m)).toFixed(1) + " " + x + " " + y;
      }
    }
    return d + "Z";
  }

  /** Each shape lists its outline elements and where the screen and buttons sit, in the 300x360 viewBox. */
  const SHAPES = {
    egg: {
      label: "Egg",
      body: '<path d="M150 24 C232 24 284 140 284 226 C284 306 224 352 150 352 C76 352 16 306 16 226 C16 140 68 24 150 24Z"/>',
      screen: { x: 70, y: 98, w: 160, h: 132 },
      buttons: { y: 284, r: 17, xs: [100, 150, 200] }
    },
    orb: {
      label: "Orb",
      body: '<circle cx="150" cy="200" r="148"/>',
      screen: { x: 66, y: 100, w: 168, h: 132 },
      buttons: { y: 284, r: 17, xs: [100, 150, 200] }
    },
    squircle: {
      label: "Squircle",
      body: '<rect x="18" y="40" width="264" height="310" rx="78"/>',
      screen: { x: 50, y: 84, w: 200, h: 146 },
      buttons: { y: 284, r: 18, xs: [98, 150, 202] }
    },
    bloom: {
      label: "Cog",
      body: '<path d="' + bloomPath() + '"/>',
      screen: { x: 72, y: 108, w: 156, h: 124 },
      buttons: { y: 280, r: 16, xs: [102, 150, 198] }
    },
    kitty: {
      label: "Kitty",
      body: '<path d="M44 132 L58 40 Q62 24 76 32 L140 90 Z"/><path d="M256 132 L242 40 Q238 24 224 32 L160 90 Z"/><rect x="20" y="74" width="260" height="278" rx="88"/>',
      extra: function (c) {
        return '<path d="M64 104 L72 56 L112 92 Z" fill="' + c.accent + '" opacity=".75"/><path d="M236 104 L228 56 L188 92 Z" fill="' + c.accent + '" opacity=".75"/>';
      },
      screen: { x: 60, y: 118, w: 180, h: 132 },
      buttons: { y: 298, r: 17, xs: [100, 150, 200] }
    },
    capsule: {
      label: "Capsule",
      body: '<rect x="46" y="28" width="208" height="324" rx="104"/>',
      screen: { x: 76, y: 96, w: 148, h: 134 },
      buttons: { y: 280, r: 15, xs: [104, 150, 196] }
    }
  };

  function pick(list) {
    return list[Math.floor(Math.random() * list.length)];
  }

  function randomDevice() {
    return {
      shape: pick(Object.keys(SHAPES)),
      colorway: pick(Object.keys(COLORWAYS)),
      pattern: pick(PATTERNS)
    };
  }

  function resolve(device) {
    const d = device || {};
    return {
      shape: SHAPES[d.shape] ? d.shape : "egg",
      colorway: COLORWAYS[d.colorway] ? d.colorway : COLORWAY_ALIASES[d.colorway] || "orchid",
      pattern: PATTERNS.indexOf(PATTERN_ALIASES[d.pattern] || d.pattern) !== -1 ? (PATTERN_ALIASES[d.pattern] || d.pattern) : "dots"
    };
  }

  function describe(device) {
    const d = resolve(device);
    return COLORWAYS[d.colorway].label + " " + SHAPES[d.shape].label.toLowerCase() + " with " + d.pattern;
  }

  const STAR = "M0,-6 L1.8,-1.9 6,-1.9 2.6,0.8 3.8,5 0,2.5 -3.8,5 -2.6,0.8 -6,-1.9 -1.8,-1.9Z";
  const HEART = "M0,4 C-7,-1 -5,-7 0,-3.5 C5,-7 7,-1 0,4Z";
  const SPARKLE = "M0,-7 Q1,-1 7,0 Q1,1 0,7 Q-1,1 -7,0 Q-1,-1 0,-7Z";
  const BOLT = "M1.5,-8 L-4.5,1 L-0.5,1 L-2,8 L4.5,-1.5 L0.5,-1.5Z";

  /** Mix a hex color toward black by the given amount (0 to 1). */
  function darken(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const ch = function (v) { return Math.round(v * (1 - amount)).toString(16).padStart(2, "0"); };
    return "#" + ch(n >> 16) + ch((n >> 8) & 255) + ch(n & 255);
  }

  function patternDef(id, name, c) {
    const a = c.accent, b = c.button;
    const open = function (w, h, extra) {
      return '<pattern id="' + id + '" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse"' + (extra || "") + ">";
    };
    switch (name) {
      case "stripes":
        return open(22, 22, ' patternTransform="rotate(38)"') + '<rect width="9" height="22" fill="' + a + '"/></pattern>';
      case "checks":
        return open(28, 28) + '<rect width="14" height="14" fill="' + a + '"/><rect x="14" y="14" width="14" height="14" fill="' + a + '"/></pattern>';
      case "stars":
        return open(36, 36) + '<path d="' + STAR + '" transform="translate(9 9)" fill="' + a + '"/><path d="' + STAR + '" transform="translate(27 27) scale(.8)" fill="' + b + '"/></pattern>';
      case "bolts":
        return open(34, 34) + '<path d="' + BOLT + '" transform="translate(9 10)" fill="' + a + '"/><path d="' + BOLT + '" transform="translate(26 26) scale(.8)" fill="' + b + '"/></pattern>';
      case "waves":
        return open(40, 18) + '<path d="M0 9 Q10 1 20 9 T40 9" fill="none" stroke="' + a + '" stroke-width="4.5" stroke-linecap="round"/></pattern>';
      case "confetti":
        return open(46, 46) +
          '<rect x="5" y="6" width="9" height="4" rx="2" transform="rotate(30 9 8)" fill="' + a + '"/>' +
          '<rect x="28" y="12" width="9" height="4" rx="2" transform="rotate(-40 32 14)" fill="' + b + '"/>' +
          '<circle cx="18" cy="30" r="3" fill="' + b + '"/><circle cx="38" cy="36" r="2.6" fill="' + a + '"/>' +
          '<rect x="6" y="36" width="8" height="4" rx="2" transform="rotate(-15 10 38)" fill="' + a + '"/></pattern>';
      case "sparkles":
        return open(40, 40) + '<path d="' + SPARKLE + '" transform="translate(10 10)" fill="' + a + '"/><path d="' + SPARKLE + '" transform="translate(30 29) scale(.65)" fill="' + a + '"/></pattern>';
      default:
        return open(28, 28) + '<circle cx="7" cy="7" r="4.2" fill="' + a + '"/><circle cx="21" cy="21" r="4.2" fill="' + a + '"/></pattern>';
    }
  }

  function pct(n, total) {
    return (n / total * 100).toFixed(3) + "%";
  }

  /** Mix a hex color toward white by the given amount (0 to 1). */
  function lighten(hex, amount) {
    const n = parseInt(hex.slice(1), 16);
    const ch = function (v) { return Math.round(v + (255 - v) * amount).toString(16).padStart(2, "0"); };
    return "#" + ch(n >> 16) + ch((n >> 8) & 255) + ch(n & 255);
  }

  function luminance(hex) {
    const n = parseInt(hex.slice(1), 16);
    return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  }

  /** The pattern's motif as a single shape centered on 0,0, about 14 units across. */
  function motif(name, fill) {
    switch (name) {
      case "stripes":
        return '<rect x="-2.6" y="-8" width="5.2" height="16" rx="2.6" transform="rotate(38)" fill="' + fill + '"/>';
      case "checks":
        return '<rect x="-5.5" y="-5.5" width="11" height="11" rx="1.5" fill="' + fill + '"/>';
      case "stars":
        return '<path d="' + STAR + '" transform="scale(1.25)" fill="' + fill + '"/>';
      case "bolts":
        return '<path d="' + BOLT + '" fill="' + fill + '"/>';
      case "waves":
        return '<path d="M-8 1 Q-4 -4 0 1 T8 1" fill="none" stroke="' + fill + '" stroke-width="3.2" stroke-linecap="round"/>';
      case "confetti":
        return '<rect x="-6" y="-2.2" width="12" height="4.4" rx="2.2" transform="rotate(-30)" fill="' + fill + '"/>';
      case "sparkles":
        return '<path d="' + SPARKLE + '" fill="' + fill + '"/>';
      default:
        return '<circle r="5" fill="' + fill + '"/>';
    }
  }

  /**
   * The screen backdrop: a pastel of the shell color with the pattern's motif repeated like a
   * checkerboard (a motif in every other cell), fading out across the screen.
   */
  function screenStyle(device) {
    const d = resolve(device);
    const c = COLORWAYS[d.colorway];
    // Very light or very dark shells would wash out, so their screens take the accent color instead.
    const lum = luminance(c.shell);
    const base = lum > 0.85 || lum < 0.2 ? c.accent : c.shell;
    const tile = '<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">' +
      '<g transform="translate(10 10)">' + motif(d.pattern, lighten(base, 0.72)) + "</g>" +
      '<g transform="translate(30 30)">' + motif(d.pattern, lighten(base, 0.72)) + "</g></svg>";
    return "--screen-top:" + lighten(base, 0.95) + ";--screen-bottom:" + lighten(base, 0.9) +
      ";--screen-motif:url('data:image/svg+xml," + encodeURIComponent(tile).replace(/'/g, "%27") + "')";
  }

  let counter = 0;

  /** Inner habitat drawn on the device screen. opts.device sets the backdrop when there's no pet yet. */
  function screenMarkup(pet, opts) {
    const options = opts || {};
    const scene = '<div class="lcd-scene" style="' + screenStyle(pet ? pet.device : options.device) + '"><span class="lcd-motif"></span></div>';
    if (options.egg) {
      return '<div class="lcd lcd-egg">' + scene +
        '<div class="lcd-egg-shape' + (options.eggState ? " is-" + options.eggState : "") + '"></div></div>';
    }
    const mood = KipCreature.mood(pet);
    const c = pet.creature;
    const hearts = [];
    const filled = c.alive ? Math.ceil(c.fullness / 25) : 0;
    for (let i = 0; i < 4; i++) {
      hearts.push('<svg class="lcd-heart' + (i < filled ? " is-full" : "") + '" viewBox="-8 -8 16 14" aria-hidden="true"><path d="' + HEART + '" transform="scale(1.4)"/></svg>');
    }
    const percent = Math.floor(KipFinance.progress(pet) * 100);
    return '<div class="lcd mood-' + mood + (KipCreature.isComplete(pet) ? " is-complete" : "") + '">' +
      scene +
      '<div class="lcd-status"><span class="lcd-hearts">' + hearts.join("") + '</span><span class="lcd-percent">' + percent + "%</span></div>" +
      '<div class="lcd-pet creature-wrap' + (mood === "dead" ? " is-dead" : mood === "hungry" ? " is-hungry" : "") + '">' +
      KipCreature.petSvgMarkup(pet, "creature") + "</div></div>";
  }

  /**
   * The full device. opts.screen is the screen's inner HTML.
   * opts.buttons, when given, makes the three buttons real: [{ label, id, ariaLabel }].
   */
  function markup(device, opts) {
    const options = opts || {};
    const d = resolve(device);
    const shape = SHAPES[d.shape];
    const c = COLORWAYS[d.colorway];
    const uid = "dev" + (++counter);
    const s = shape.screen;
    const bz = 12;

    let svg = '<svg class="device-shell" viewBox="0 0 ' + VIEW_W + " " + VIEW_H + '" aria-hidden="true">' +
      "<defs>" +
      '<linearGradient id="' + uid + 'g" x1="0" y1="0" x2="0.4" y2="1"><stop offset="0" stop-color="' + c.shell + '"/><stop offset="1" stop-color="' + c.shell2 + '"/></linearGradient>' +
      patternDef(uid + "p", d.pattern, c) +
      '<clipPath id="' + uid + 'c">' + shape.body + "</clipPath>" +
      '<radialGradient id="' + uid + 'h" cx=".3" cy=".2" r=".6"><stop offset="0" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>' +
      "</defs>";

    // A 4px stroke under the fills leaves a 2px border outside the shell at any size.
    svg += '<g fill="none" stroke="' + darken(c.shell2, 0.2) + '" stroke-width="4" stroke-linejoin="round" vector-effect="non-scaling-stroke">' + shape.body + "</g>" +
      '<g fill="url(#' + uid + 'g)">' + shape.body + "</g>" +
      '<g fill="url(#' + uid + 'p)" opacity=".55">' + shape.body + "</g>" +
      (shape.extra ? shape.extra(c) : "") +
      '<g clip-path="url(#' + uid + 'c)"><ellipse cx="96" cy="96" rx="96" ry="70" fill="url(#' + uid + 'h)"/>' +
      '<ellipse cx="150" cy="380" rx="200" ry="70" fill="' + INK + '" opacity=".05"/></g>' +
      '<rect x="' + (s.x - bz) + '" y="' + (s.y - bz + 3) + '" width="' + (s.w + bz * 2) + '" height="' + (s.h + bz * 2) + '" rx="24" fill="' + INK + '" opacity=".18"/>' +
      '<rect x="' + (s.x - bz) + '" y="' + (s.y - bz) + '" width="' + (s.w + bz * 2) + '" height="' + (s.h + bz * 2) + '" rx="24" fill="' + c.bezel + '"/>';

    const b = shape.buttons;
    b.xs.forEach(function (x) {
      svg += '<circle cx="' + x + '" cy="' + (b.y + 4) + '" r="' + b.r + '" fill="' + INK + '" opacity=".3"/>' +
        '<circle cx="' + x + '" cy="' + b.y + '" r="' + b.r + '" fill="' + c.button + '"/>' +
        '<ellipse cx="' + (x - b.r * 0.3) + '" cy="' + (b.y - b.r * 0.35) + '" rx="' + (b.r * 0.38) + '" ry="' + (b.r * 0.24) + '" fill="#fff" opacity=".7"/>';
    });
    svg += "</svg>";

    const screenStyle = "left:" + pct(s.x, VIEW_W) + ";top:" + pct(s.y, VIEW_H) + ";width:" + pct(s.w, VIEW_W) + ";height:" + pct(s.h, VIEW_H);
    let html = '<div class="device shape-' + d.shape + '" style="--device-shell:' + c.shell + ";--device-shell-2:" + c.shell2 + ";--device-accent:" + c.accent + ";--device-button:" + c.button + '">' +
      svg + '<div class="device-screen" style="' + screenStyle + '">' + (options.screen || "") + "</div>";

    if (options.buttons) {
      options.buttons.forEach(function (btn, i) {
        const x = b.xs[i];
        const hit = b.r + 6;
        const style = "left:" + pct(x - hit, VIEW_W) + ";top:" + pct(b.y - hit, VIEW_H) + ";width:" + pct(hit * 2, VIEW_W) + ";height:" + pct(hit * 2, VIEW_H);
        html += '<button type="button" class="device-btn" id="' + btn.id + '" style="' + style + '" aria-label="' + btn.ariaLabel + '"></button>' +
          '<span class="device-btn-label" style="left:' + pct(x, VIEW_W) + ";top:" + pct(b.y + b.r + 10, VIEW_H) + '">' + btn.label + "</span>";
      });
    }
    return html + "</div>";
  }

  return {
    NAME,
    NAME_PLURAL,
    COLORWAYS,
    resolve,
    SHAPES,
    PATTERNS,
    randomDevice,
    describe,
    markup,
    screenMarkup
  };
})();
