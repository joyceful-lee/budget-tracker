/**
 * Block-art screen: pets are drawn with half-block cells (▀ ▄ █), so every text cell holds two
 * stacked pixels with their own colors, plus ░ shading for wispy parts. Faces are text cells with a
 * body-colored background and black characters, so a 0.0 face sits inside the filled body.
 * Everything is painted on a canvas so the blocks butt together with no gaps between lines.
 * Every color comes from the classic 16-color ANSI palette.
 */
const KipScreen = (function () {
  /** The pixel grid is at least this big; wide or tall screens gain pixels on the long side. */
  const MIN_PX_COLS = 23;
  const MIN_PX_ROWS = 20;
  /** Pixel rows reserved for the status row above the pet. */
  const STATUS_ROWS = 3;
  /** Type size for every character on the screen, as a multiple of one pixel. */
  const TEXT_SCALE = 1.5;
  /** Extra space between characters, in CSS pixels. */
  const KERNING = 1;
  /** Hearts: a block when filled, a dash when empty. */
  const HEART_FULL = "█";
  const HEART_EMPTY = "-";
  const FRAME_MS = 600;
  const FONT_FAMILY = 'ui-monospace, "Cascadia Mono", Consolas, Menlo, "Courier New", monospace';
  /** Fonts that carry the ░ shade glyph on common systems. */
  const GLYPH_FAMILY = '"Segoe UI Symbol", "Cascadia Mono", "DejaVu Sans Mono", "Apple Symbols", "Noto Sans Symbols 2", monospace';

  /** The 16 ANSI colors (VGA values). */
  const ANSI = {
    black: "#000000",
    red: "#aa0000",
    green: "#00aa00",
    yellow: "#aa5500",
    blue: "#0000aa",
    magenta: "#aa00aa",
    cyan: "#00aaaa",
    white: "#aaaaaa",
    brightBlack: "#555555",
    brightRed: "#ff5555",
    brightGreen: "#55ff55",
    brightYellow: "#ffff55",
    brightBlue: "#5555ff",
    brightMagenta: "#ff55ff",
    brightCyan: "#55ffff",
    brightWhite: "#ffffff"
  };

  const FACES = {
    happy: "0.0",
    okay: "0.0",
    hungry: "-.-",
    dead: "x.x",
    complete: "^.^",
    eating: "0o0"
  };

  /**
   * Sprites are pixel maps, two pixel rows per text cell. Keys: "." empty, b body, d dark, h highlight,
   * w white, c cheek, g second highlight, S ░ shading (fills a whole cell), F face (a whole cell; three
   * F cells in a row hold the face). Heights are even and face rows start on an even row.
   * faceBg names the key whose color sits behind the face.
   */
  const SPRITES = {
    // A teardrop flame that grows flame hair, then arms.
    fire: {
      colors: { b: ANSI.brightRed, d: ANSI.red, h: ANSI.brightYellow },
      baby: [
        "....h....",
        "...hh....",
        "...hbh...",
        "..hbbbh..",
        "..bbbbb..",
        ".bbbbbbb.",
        ".bbFFFbb.",
        ".bbFFFbb.",
        "..bbbbb..",
        "...ddd..."
      ],
      teen: [
        "....h.h....",
        "..h.hbh.h..",
        "..hbbbbbh..",
        ".bbbbbbbbb.",
        ".bbbbbbbbb.",
        "bbbbbbbbbbb",
        "bbbbFFFbbbb",
        "bbbbFFFbbbb",
        "bbbbbbbbbbb",
        ".bbbbbbbbb.",
        "..dd...dd..",
        "..dd...dd.."
      ],
      adult: [
        ".....h.h.h.....",
        "....hh.h.hh....",
        "....hbhbhbh....",
        "...bbbbbbbbb...",
        "..bbbbbbbbbbb..",
        "..bbbbbbbbbbb..",
        "..bbbbFFFbbbb..",
        "..bbbbFFFbbbb..",
        ".bbbbbbbbbbbbb.",
        "bdbbbbbbbbbbbdb",
        "bd.bbbbbbbbb.db",
        "d..bbbbbbbbb..d",
        "...bbbbbbbbb...",
        "...bbbbbbbbb...",
        "...dd.....dd...",
        "...dd.....dd..."
      ]
    },
    // A round blob with side fins and blushing cheeks.
    water: {
      colors: { b: ANSI.brightBlue, d: ANSI.blue, h: ANSI.brightCyan, w: ANSI.brightWhite, c: ANSI.brightMagenta },
      baby: [
        "...bbbbb...",
        ".bbwbbbbbb.",
        "bbbbFFFbbbb",
        "bbbbFFFbbbb",
        ".bbbbbbbbb.",
        "...bbbbb..."
      ],
      teen: [
        ".....bbbbb.....",
        "...bbbbbbbbb...",
        "..bbwbbbbbbbb..",
        "h.bbbbbbbbbbb.h",
        "hhbbbbFFFbbbbhh",
        "hhbbbbFFFbbbbhh",
        "h.bbcbbbbbcbb.h",
        "..bbbbbbbbbbb..",
        "...bbbbbbbbb...",
        ".....bbbbb....."
      ],
      adult: [
        ".......bbbbb.......",
        ".....bbbbbbbbb.....",
        "....bbwwbbbbbbb....",
        "...bbwbbbbbbbbbb...",
        "hh.bbbbbbbbbbbbb.hh",
        "hhhbbbbbbbbbbbbbhhh",
        "hhhbbbbbFFFbbbbbhhh",
        "hhhbbbbbFFFbbbbbhhh",
        "hh.bbcbbbbbbbcbb.hh",
        "...bbbbbbbbbbbbb...",
        "...bbbbbbbbbbbbb...",
        "....bbbbbbbbbbb....",
        ".....bbbbbbbbb.....",
        ".......bbbbb......."
      ]
    },
    // A puffy cloud that keeps getting bigger.
    air: {
      colors: { b: ANSI.brightWhite, d: ANSI.white, h: ANSI.brightCyan },
      baby: [
        "....bbb....",
        "..bbbbbbb..",
        ".bbbFFFbbb.",
        "bbbbFFFbbbb",
        "bbbbbbbbbbb",
        ".ddddddddd."
      ],
      teen: [
        "...bbb...bbb...",
        "..bbbbb.bbbbb..",
        ".bbbbbbbbbbbbb.",
        "bbbbbbbbbbbbbbb",
        "bbbbbbFFFbbbbbb",
        "bbbbbbFFFbbbbbb",
        "bbbbbbbbbbbbbbb",
        ".ddddddddddddd."
      ],
      adult: [
        "......bbb...bbb......",
        "....bbbbbbbbbbbbb....",
        "..bbbbbbbbbbbbbbbbb..",
        ".bbbbbbbbbbbbbbbbbbb.",
        "bbbbbbbbbbbbbbbbbbbbb",
        "hbbbbbbbbbbbbbbbbbbbh",
        "bbbbbbbbbFFFbbbbbbbbb",
        "bbbbbbbbbFFFbbbbbbbbb",
        "bbbbbbbbbbbbbbbbbbbbb",
        ".ddddddddddddddddddd."
      ]
    },
    // A mossy rock that grows handle arms and stubby legs.
    earth: {
      colors: { b: ANSI.white, d: ANSI.brightBlack, h: ANSI.brightGreen, g: ANSI.green },
      baby: [
        "...hhghh...",
        "..hhhhhhh..",
        ".bbbbbbbbb.",
        ".bbbbbbbbb.",
        "bbbbFFFbbbb",
        "bbbbFFFbbbb",
        "bbbbbbbbbbb",
        "ddddddddddd"
      ],
      teen: [
        "......hhghh......",
        ".....hhhhhhh.....",
        "....bbbbbbbbb....",
        ".dd.bbbbbbbbb.dd.",
        "d..dbbbFFFbbbd..d",
        "d..dbbbFFFbbbd..d",
        ".dd.bbbbbbbbb.dd.",
        "....bbbbbbbbb....",
        "....ddddddddd....",
        ".....dd...dd.....",
        ".....dd...dd.....",
        ".....dd...dd....."
      ],
      adult: [
        ".......hhhghhh.......",
        "......hhhhhhhhh......",
        ".....hhhhhhhhhhh.....",
        "....bbbbbbbbbbbbb....",
        "...bbbbbbbbbbbbbbb...",
        ".dd.bbbbbbbbbbbbb.dd.",
        "d..dbbbbbFFFbbbbbd..d",
        "d..dbbbbbFFFbbbbbd..d",
        "d..dbbbbbbbbbbbbbd..d",
        ".dd.bbbbbbbbbbbbb.dd.",
        "....bbbbbbbbbbbbb....",
        "....bbbbbbbbbbbbb....",
        ".....ddddddddddd.....",
        ".....ddd.....ddd.....",
        ".....ddd.....ddd.....",
        "....dddd.....dddd...."
      ]
    },
    // A little gear that becomes a boxy robot with a screen face and an antenna.
    metal: {
      colors: { b: ANSI.white, d: ANSI.brightBlack, h: ANSI.brightCyan, w: ANSI.brightWhite },
      faceBg: "w",
      baby: [
        ".....d.....",
        "..d..d..d..",
        "...bbbbb...",
        ".dbbbbbbbd.",
        "ddbbFFFbbdd",
        "ddbbFFFbbdd",
        ".dbbbbbbbd.",
        "...bbbbb...",
        "..d..d..d..",
        ".....d....."
      ],
      teen: [
        "......d......",
        "..d...d...d..",
        "...dbbbbbd...",
        "..bbbbbbbbb..",
        "ddbwwFFFwwbdd",
        "ddbwwFFFwwbdd",
        "..bbbbbbbbb..",
        "...dbbbbbd...",
        "..d...d...d..",
        "......d......"
      ],
      adult: [
        "........h........",
        "........d........",
        "...ddddddddddd...",
        "...dbbbbbbbbbd...",
        "dd.dbbwFFFwbbd.dd",
        "dd.dbbwFFFwbbd.dd",
        "dd.dbbbbbbbbbd.dd",
        "...dbbbbbbbbbd...",
        "...dbhbbbbbhbd...",
        "...dbbbbbbbbbd...",
        "...ddddddddddd...",
        ".....dd...dd.....",
        ".....dd...dd.....",
        "....ddd...ddd...."
      ]
    },
    // A lightning bolt that becomes a spiky crab.
    electric: {
      colors: { b: ANSI.brightYellow, d: ANSI.yellow, h: ANSI.brightCyan },
      baby: [
        ".....bbb.",
        "....bbb..",
        "...bbb...",
        "..bbbb...",
        ".bFFFbbb.",
        ".bFFFbbb.",
        "...bbbb..",
        "...bbb...",
        "..bbb....",
        "..bb.....",
        ".bb......",
        ".b......."
      ],
      teen: [
        ".......h.......",
        "......hbh......",
        "....bbbbbbb....",
        ".d.bbbbbbbbb.d.",
        "..dbbbFFFbbbd..",
        "..dbbbFFFbbbd..",
        ".d.bbbbbbbbb.d.",
        "d...ddddddd...d",
        "...d.......d...",
        "..d.........d.."
      ],
      adult: [
        ".........hhh.........",
        "..........h..........",
        "bb.....bbbbbbb.....bb",
        "bbb..bbbbbbbbbbb..bbb",
        "..bbdbbbbFFFbbbbdbb..",
        "..bbdbbbbFFFbbbbdbb..",
        "....dbbbbbbbbbbbd....",
        "...d.ddddddddddd.d...",
        "..d..d.........d..d..",
        ".d..d...........d..d."
      ]
    },
    // A lumpy puff of smoke that trails wisps and raises its arms.
    dark: {
      colors: { b: ANSI.magenta, d: ANSI.magenta, h: ANSI.brightMagenta, S: ANSI.magenta },
      baby: [
        "....bbb....",
        "..bbbbbbb..",
        ".bbbFFFbbb.",
        "bbbbFFFbbbb",
        "SSSSSSSSSSS",
        "SSSSSSSSSSS"
      ],
      teen: [
        "...bbb...bbb...",
        "..bbbbb.bbbbb..",
        ".bbbbbbbbbbbbb.",
        "bbbbbbbbbbbbbbb",
        "bbbbbbFFFbbbbbb",
        "bbbbbbFFFbbbbbb",
        "SSSSSSSSSSSSSSS",
        "SSSSSSSSSSSSSSS"
      ],
      adult: [
        "hh.................hh",
        ".bb......bbb......bb.",
        "..bb...bbbbbbb...bb..",
        "...bb.bbbbbbbbb.bb...",
        "....bbbbbbbbbbbbb....",
        "...bbbbbbbbbbbbbbb...",
        "...bbbbbbFFFbbbbbb...",
        "...bbbbbbFFFbbbbbb...",
        "..bbbbbbbbbbbbbbbbb..",
        "..bbbbbbbbbbbbbbbbb..",
        "..SSSSSSSSSSSSSSSSS..",
        "..SSSSSSSSSSSSSSSSS.."
      ]
    },
    // A round bug with wings that grows antennae tipped with bulbs.
    fairy: {
      colors: { b: ANSI.brightMagenta, d: ANSI.magenta, h: ANSI.brightYellow, w: ANSI.brightWhite },
      baby: [
        "....bbbbb....",
        "ww.bbbbbbb.ww",
        "wwbbbFFFbbbww",
        "wwbbbFFFbbbww",
        "...bbbbbbb...",
        ".....bbb....."
      ],
      teen: [
        "..h.......h..",
        "...d.....d...",
        "....dbbbd....",
        "...bbbbbbb...",
        "wwbbbFFFbbbww",
        "wwbbbFFFbbbww",
        "ww.bbbbbbb.ww",
        "....bbbbb...."
      ],
      adult: [
        "..hh.........hh..",
        "..hh.........hh..",
        "....d.......d....",
        ".....d.....d.....",
        "......bbbbb......",
        "....bbbbbbbbb....",
        "www.bbbbbbbbb.www",
        "wwwbbbbbbbbbbbwww",
        "wwwbbbbFFFbbbbwww",
        "wwwbbbbFFFbbbbwww",
        "www.bbbbbbbbb.www",
        "....bbbbbbbbb....",
        "......bbbbb......",
        "................."
      ]
    },
    // A coin that grows feet.
    money: {
      colors: { b: ANSI.brightYellow, d: ANSI.yellow, h: ANSI.brightWhite },
      baby: [
        "...ddddd...",
        ".ddbbbbbdd.",
        ".dbhbbbbbd.",
        "dbbbbbbbbbd",
        "dbbbFFFbbbd",
        "dbbbFFFbbbd",
        "dbbbbbbbbbd",
        ".dbbbbbbbd.",
        ".ddbbbbbdd.",
        "...ddddd..."
      ],
      teen: [
        "....ddddd....",
        "..ddbbbbbdd..",
        ".dbhbbbbbbbd.",
        ".dbbbbbbbbbd.",
        "dbbbbFFFbbbbd",
        "dbbbbFFFbbbbd",
        "dbbbbbbbbbbbd",
        ".dbbbbbbbbbd.",
        "..ddbbbbbdd..",
        "....ddddd....",
        "...dd...dd...",
        "..ddd...ddd.."
      ],
      adult: [
        ".....ddddd.....",
        "...ddbbbbbdd...",
        "..dbhhbbbbbbd..",
        ".dbhbbbbbbbbbd.",
        ".dbbbbbbbbbbbd.",
        "dbbbbbbbbbbbbbd",
        "dbbbbbFFFbbbbbd",
        "dbbbbbFFFbbbbbd",
        "dbbbbbbbbbbbbbd",
        ".dbbbbbbbbbbbd.",
        "..ddbbbbbbbdd..",
        "....ddddddd....",
        "....dd...dd....",
        "...ddd...ddd..."
      ]
    }
  };

  /** Species from older saves borrow the closest current art. */
  const ALIASES = { bean: "earth", drizzle: "water", puff: "air" };

  function spriteFor(pet) {
    return SPRITES[pet.speciesId] || SPRITES[ALIASES[pet.speciesId]] || null;
  }

  function supports(pet) {
    return !!spriteFor(pet);
  }

  /** Whether a sprite pixel holds anything; outside the sprite counts as empty. */
  function filled(art, x, y) {
    const row = art[y];
    return !!row && x >= 0 && x < row.length && row[x] !== ".";
  }

  function stageArt(sprite, age) {
    return sprite[age] || sprite.adult;
  }

  /** Mount a block-art screen into a device screen element. Returns { update, act, destroy }. */
  function mount(container, initialPet) {
    const status = document.createElement("div");
    status.className = "lcd-ascii-status";
    status.setAttribute("aria-hidden", "true");
    const canvas = document.createElement("canvas");
    canvas.className = "lcd-blocks";
    canvas.setAttribute("aria-hidden", "true");
    const wrap = document.createElement("div");
    wrap.className = "lcd-ascii-wrap";
    wrap.appendChild(status);
    wrap.appendChild(canvas);
    container.innerHTML = "";
    container.appendChild(wrap);
    const ctx = canvas.getContext("2d");

    let pet = initialPet;
    let px = 8;
    let pxCols = MIN_PX_COLS;
    let pxRows = MIN_PX_ROWS;
    let frame = 0;
    let anim = null;

    function resize() {
      const w = container.clientWidth;
      const fullH = container.clientHeight;
      if (!w || !fullH) return;
      const dpr = window.devicePixelRatio || 1;
      // The status row takes STATUS_ROWS pixel rows and uses the same type size as the pet's characters.
      px = Math.max(2, Math.floor(Math.min((w * dpr) / MIN_PX_COLS, (fullH * dpr) / (MIN_PX_ROWS + STATUS_ROWS))));
      const statusH = (STATUS_ROWS * px) / dpr;
      status.style.fontSize = (px * TEXT_SCALE / dpr) + "px";
      status.style.height = statusH + "px";
      canvas.style.top = statusH + "px";
      const h = fullH - statusH;
      pxCols = Math.floor((w * dpr) / px);
      pxRows = Math.floor((h * dpr) / px);
      if (pxRows % 2) pxRows -= 1;
      canvas.width = pxCols * px;
      canvas.height = pxRows * px;
      canvas.style.width = (canvas.width / dpr) + "px";
      canvas.style.height = (canvas.height / dpr) + "px";
      draw();
    }

    /** Fill whole pixels, leaving a KERNING gap after each column and row so every block reads on its own. */
    function rect(x, y, w, h, color) {
      const gap = Math.round(KERNING * (window.devicePixelRatio || 1));
      ctx.fillStyle = color;
      for (let i = 0; i < w; i++) {
        for (let j = 0; j < h; j++) ctx.fillRect((x + i) * px, (y + j) * px, px - gap, px - gap);
      }
    }

    /** A glyph stretched to fill one whole cell, clipped so it never spills into its neighbors. */
    function glyphCell(x, y, ch, color, bg) {
      if (bg) rect(x, y, 1, 2, bg);
      ctx.save();
      ctx.beginPath();
      ctx.rect(x * px, y * px, px, 2 * px);
      ctx.clip();
      ctx.font = Math.round(px * 2.2) + "px " + GLYPH_FAMILY;
      const width = ctx.measureText(ch).width || px;
      ctx.translate(x * px + px / 2, y * px + px);
      ctx.scale(px / width, 1);
      ctx.fillStyle = color;
      ctx.fillText(ch, 0, 0);
      ctx.restore();
    }

    /** A text cell: a full cell of background with a character centered in it. */
    function textCell(x, y, ch, fg, bg) {
      if (bg) rect(x, y, 1, 2, bg);
      ctx.fillStyle = fg;
      ctx.fillText(ch, x * px + px / 2, y * px + px + px * 0.08);
    }

    function text(x, y, str, fg, bg) {
      for (let i = 0; i < str.length; i++) textCell(x + i, y, str[i], fg, bg);
    }

    /** One ASCII character filling a single pixel (half a text cell). */
    function charPixel(x, y, ch, color) {
      ctx.save();
      ctx.font = "700 " + Math.round(px * 1.15) + "px " + FONT_FAMILY;
      ctx.fillStyle = color;
      ctx.fillText(ch, x * px + px / 2, y * px + px / 2 + px * 0.06);
      ctx.restore();
    }

    /**
     * A pixel that borders black is typed as an ASCII character instead of a solid square, so the
     * outline reads as text: "#" along edges, and a lighter ":" on tips with black on three or more sides.
     */
    function fringePixel(x, y, color, open) {
      const sides = (open.left ? 1 : 0) + (open.right ? 1 : 0) + (open.up ? 1 : 0) + (open.down ? 1 : 0);
      charPixel(x, y, sides >= 3 ? ":" : "#", color);
    }

    /** Solid ground with a row of ASCII grass along its top edge that sways between frames. */
    function drawGround(dead) {
      const y = pxRows - 2;
      for (let x = 0; x < pxCols; x++) {
        const color = dead ? ANSI.brightBlack : x % 3 ? ANSI.green : ANSI.brightGreen;
        rect(x, y + 1, 1, 1, color);
        charPixel(x, y, (x + frame) % 2 ? "," : "'", color);
      }
    }

    function renderStatus() {
      const c = pet.creature;
      const filled = c.alive ? Math.ceil(c.fullness / 25) : 0;
      let hearts = "";
      for (let i = 0; i < 4; i++) hearts += '<span style="color:' + (i < filled ? ANSI.brightRed : ANSI.brightBlack) + '">' + (i < filled ? HEART_FULL : HEART_EMPTY) + "</span>" + (i < 3 ? " " : "");
      status.innerHTML = "<span>" + hearts + '</span><span style="color:' + ANSI.brightWhite + '">' + Math.floor(KipFinance.progress(pet) * 100) + "%</span>";
    }

    /** Pixel row where the top of the pet sits when it isn't bobbing; always even so cells line up. */
    function restingTop(art) {
      const top = pxRows - 2 - art.length;
      return top - (top % 2);
    }

    function draw() {
      if (!pet) return;
      const sprite = spriteFor(pet);
      const art = stageArt(sprite, pet.creature.age);
      const mood = KipCreature.mood(pet);
      const complete = KipCreature.isComplete(pet);
      const dead = mood === "dead";
      let face = complete ? FACES.complete : FACES[mood] || FACES.happy;
      if (anim && anim.kind === "feed" && anim.chomp) face = FACES.eating;

      renderStatus();
      ctx.fillStyle = ANSI.black;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      drawGround(dead);
      ctx.font = "700 " + Math.round(px * TEXT_SCALE) + "px " + FONT_FAMILY;

      // Bobbing lifts the pet a whole cell (two pixel rows) so the face stays on a cell.
      let lift = dead || mood === "hungry" ? 0 : frame % 2;
      if (anim && anim.kind === "play") lift = anim.hop;
      const top = restingTop(art) - lift * 2;
      const left = Math.floor((pxCols - art[0].length) / 2);
      const colorOf = function (key) {
        if (dead) return key === "d" || key === "S" ? ANSI.brightBlack : ANSI.white;
        return sprite.colors[key] || ANSI.brightWhite;
      };

      for (let ry = 0; ry < art.length; ry += 2) {
        const upper = art[ry];
        const lower = art[ry + 1] || "";
        let faceIndex = 0;
        for (let rx = 0; rx < upper.length; rx++) {
          const a = upper[rx];
          const b = lower[rx] || ".";
          const x = left + rx;
          const y = top + ry;
          if (a === "F" && b === "F") {
            // Face characters spread outward by the kerning so 0.0 doesn't crowd together.
            rect(x, y, 1, 2, colorOf(sprite.faceBg || "b"));
            ctx.fillStyle = ANSI.black;
            ctx.fillText(face[faceIndex] || " ", x * px + px / 2 + (faceIndex - 1) * KERNING * (window.devicePixelRatio || 1), y * px + px + px * 0.08);
            faceIndex += 1;
          } else if (a === "S" && b === "S") {
            glyphCell(x, y, "\u2591", colorOf("S"), null);
          } else {
            [[a, ry, y], [b, ry + 1, y + 1]].forEach(function (p) {
              if (p[0] === ".") return;
              const open = {
                left: !filled(art, rx - 1, p[1]),
                right: !filled(art, rx + 1, p[1]),
                up: !filled(art, rx, p[1] - 1),
                down: !filled(art, rx, p[1] + 1)
              };
              if (open.left || open.right || open.up || open.down) fringePixel(x, p[2], colorOf(p[0]), open);
              else rect(x, p[2], 1, 1, colorOf(p[0]));
            });
          }
        }
      }

      const cx = left + Math.floor(art[0].length / 2);
      if (mood === "hungry") text(Math.min(cx + Math.ceil(art[0].length / 2), pxCols - 1), Math.max(0, top - 2), "?", ANSI.brightWhite, null);
      if (complete) {
        const on = frame % 2;
        [[-2, 2], [art[0].length + 1, 4], [-1, -2], [art[0].length, -2]].forEach(function (p, i) {
          if ((i + on) % 2) rect(left + p[0], top + p[1], 1, 1, ANSI.brightYellow);
        });
      }
      if (dead) text(Math.floor((pxCols - 6) / 2), pxRows - 2, "R.I.P.", ANSI.brightWhite, ANSI.black);
      if (anim && anim.kind === "feed" && anim.coinRow !== null) text(cx, anim.coinRow, "$", ANSI.brightYellow, null);
    }

    /** Short scripted animations: "feed" drops a coin and the pet chomps, "play" hops. */
    function act(kind) {
      const art = stageArt(spriteFor(pet), pet.creature.age);
      const faceRow = restingTop(art) + art.findIndex(function (r) { return r.indexOf("F") !== -1; });
      const steps = kind === "feed" ? 6 : 4;
      let i = 0;
      anim = { kind: kind, hop: 0, coinRow: null, chomp: false };
      const step = function () {
        if (kind === "feed") {
          const row = Math.round((faceRow - 2) * (i / 3));
          anim.coinRow = i < 4 ? row - (row % 2) : null;
          anim.chomp = i >= 4 && i % 2 === 0;
        } else {
          anim.hop = [1, 2, 1, 0][i];
        }
        draw();
        i += 1;
        if (i < steps) window.setTimeout(step, 150);
        else { anim = null; draw(); }
      };
      step();
    }

    const observer = new ResizeObserver(resize);
    observer.observe(container);
    const timer = window.setInterval(function () { frame += 1; draw(); }, FRAME_MS);
    if (document.fonts) document.fonts.ready.then(resize);
    resize();

    return {
      update: function (next) { pet = next; draw(); },
      act: act,
      destroy: function () {
        window.clearInterval(timer);
        observer.disconnect();
      }
    };
  }

  return { supports: supports, mount: mount, SPRITES: SPRITES };
})();
