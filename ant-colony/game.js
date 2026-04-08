// === MYRKOLONIN — Sandkorn-version ===

// --- KONSTANTER ---
const TILE = 32;
const GRID_W = 30;
const GRID_H = 50;
const QUEEN_X = 15;
const QUEEN_Y = 4;      // grunt, nära ytan
const SURFACE_Y = 0;    // markyta-rad
const ENTRANCE_X = 15;
const ENTRANCE_Y = 1;   // ingångshål
const WORLD_W = GRID_W * TILE;
const WORLD_H = GRID_H * TILE;

// Sandkorn per djup
function sandGrains(y) {
  if (y <= 5) return 2;
  if (y <= 15) return 3;
  if (y <= 30) return 4;
  return 5;
}

// Ägg
const EGG_LAY_INTERVAL = 15;
const EGG_MIN_HATCH = 3;
const EGG_AUTO_HATCH = 15;

// Zoom
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.0;
const ZOOM_DEFAULT = 0.9;
const ZOOM_STEP = 0.15;

// Vatten
const WATER_USE_INTERVAL = 30;
const DEHYDRATION_SPEED = 0.5;

// Resurser
const RESOURCE_CHANCE = 0.15;
const RESOURCES = {
  smulor:      { food: 1, protein: 0, water: 0, color: [180, 160, 120], label: "Smulor",     trips: [2, 3] },
  vatten:      { food: 0, protein: 0, water: 2, color: [100, 160, 220], label: "Vatten",     trips: [2, 3] },
  frukt:       { food: 2, protein: 1, water: 0, color: [220, 120, 60],  label: "Frukt",      trips: [2, 4] },
  insekt:      { food: 0, protein: 2, water: 0, color: [80, 120, 60],   label: "Insekt",     trips: [3, 5] },
  honungsdagg: { food: 0, protein: 0, water: 0, color: [180, 220, 80],  label: "Bladlöss!",  trips: [1, 1] },
  socker:      { food: 4, protein: 0, water: 0, color: [250, 250, 250], label: "Socker!",    trips: [4, 7] },
};
const NEAR_TABLE = [
  { kind: "smulor", weight: 30 }, { kind: "vatten", weight: 28 },
  { kind: "frukt", weight: 18 }, { kind: "insekt", weight: 15 },
  { kind: "honungsdagg", weight: 4 }, { kind: "socker", weight: 5 },
];
const FAR_TABLE = [
  { kind: "smulor", weight: 20 }, { kind: "vatten", weight: 15 },
  { kind: "frukt", weight: 15 }, { kind: "insekt", weight: 22 },
  { kind: "honungsdagg", weight: 15 }, { kind: "socker", weight: 13 },
];
function totalWeight(table) { return table.reduce((s, r) => s + r.weight, 0); }

const EGG_COST = { worker: { food: 3, protein: 1 }, soldier: { food: 3, protein: 3 }, scout: { food: 4, protein: 1 } };

// Färger
const COL_FOG = [15, 10, 8];
const COL_DIRT = [101, 67, 33];
const COL_TUNNEL = [185, 155, 110];
const COL_CHAMBER = [200, 175, 130];
const COL_ROCK = [60, 55, 50];
const COL_SURFACE = [60, 120, 40];   // gräsgrön markyta
const COL_SKY = [100, 160, 220];     // himmel ovanför
const COL_SAND_PILE = [190, 170, 130];
const COL_ANT = [45, 30, 15];
const COL_ANT_CARRY = [80, 55, 25];
const COL_QUEEN = [160, 80, 40];
const COL_BG = [30, 20, 12];
const COL_PLAN = [255, 200, 80];
const COL_EGG = [245, 235, 210];
const COL_EGG_READY = [180, 255, 160];

const DOUBLE_TAP_MS = 350;

kaplay({
  background: COL_BG,
  width: window.innerWidth,
  height: window.innerHeight,
  pixelDensity: Math.min(devicePixelRatio, 2),
  stretch: true,
  letterbox: false,
  touchToMouse: true,
  crisp: true,
});

// === KOLONI-STATE ===
function createColony() {
  return {
    grid: [],
    antCount: 0,
    tunnelCount: 0,
    startTime: 0,
    queenTimer: 0,
    queenInterval: EGG_LAY_INTERVAL,
    digPlan: [],       // [{x, y}, ...] rutor att gräva (ordnade)
    eggs: [],
    food: 8, protein: 4, water: 12,
    aphidFarms: [],
    waterTimer: WATER_USE_INTERVAL,
    dehydrated: false,
    sandPiles: [],       // [{x, amount}] högar på ytan
    sandTotal: 0,
  };
}

let colony = null;

// === Resurs-val ===
function pickResource(depth) {
  const table = depth > 12 ? FAR_TABLE : NEAR_TABLE;
  const tw = totalWeight(table);
  let r = Math.random() * tw;
  for (const entry of table) {
    r -= entry.weight;
    if (r <= 0) {
      const res = RESOURCES[entry.kind];
      const trips = res.trips[0] + Math.floor(Math.random() * (res.trips[1] - res.trips[0] + 1));
      return { kind: entry.kind, ...res, tripsLeft: trips, tripsMax: trips };
    }
  }
  const res = RESOURCES.smulor;
  return { kind: "smulor", ...res, tripsLeft: 2, tripsMax: 2 };
}

// === GRID ===
function initGrid(col) {
  col.grid = [];
  for (let y = 0; y < GRID_H; y++) {
    col.grid[y] = [];
    for (let x = 0; x < GRID_W; x++) {
      if (y === SURFACE_Y) {
        // Markyta
        col.grid[y][x] = { type: "surface", revealed: true, rockVariant: 0, resource: null, grains: 0, grainsMax: 0 };
      } else {
        col.grid[y][x] = {
          type: "dirt",
          revealed: false,
          rockVariant: Math.random(),
          resource: null,
          grains: sandGrains(y),
          grainsMax: sandGrains(y),
        };
      }
    }
  }

  // Sten (8%, inte nära start)
  for (let y = 2; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++) {
      if (Math.abs(x - QUEEN_X) > 4 || Math.abs(y - QUEEN_Y) > 4)
        if (Math.random() < 0.08) { col.grid[y][x].type = "rock"; col.grid[y][x].grains = 0; }
    }

  // Resurser (inte nära start)
  for (let y = 2; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++) {
      const t = col.grid[y][x];
      if (t.type === "dirt" && (Math.abs(x - QUEEN_X) > 3 || Math.abs(y - QUEEN_Y) > 3))
        if (Math.random() < RESOURCE_CHANCE)
          t.resource = pickResource(y);
    }

  // Ingångshål (rad 1)
  col.grid[ENTRANCE_Y][ENTRANCE_X] = { type: "tunnel", revealed: true, rockVariant: 0, resource: null, grains: 0, grainsMax: 0 };

  // Vertikal tunnel från ingång ner till kammare
  for (let y = ENTRANCE_Y + 1; y < QUEEN_Y - 1; y++)
    col.grid[y][QUEEN_X] = { type: "tunnel", revealed: true, rockVariant: 0, resource: null, grains: 0, grainsMax: 0 };

  // Drottningkammare (3×3)
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      col.grid[QUEEN_Y + dy][QUEEN_X + dx] = { type: "chamber", revealed: true, rockVariant: 0, resource: null, grains: 0, grainsMax: 0 };

  // Korta tunnlar ut från kammare (2 rutor i varje riktning)
  for (const [ddx, ddy] of [[0, 1], [-1, 0], [1, 0]]) { // inte uppåt (redan tunnel)
    for (let i = 2; i <= 3; i++) {
      const gx = QUEEN_X + ddx * i, gy = QUEEN_Y + ddy * i;
      if (gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H && gy > SURFACE_Y)
        col.grid[gy][gx] = { type: "tunnel", revealed: true, rockVariant: 0, resource: null, grains: 0, grainsMax: 0 };
    }
  }

  // Avslöja runt start
  for (let y = 0; y <= QUEEN_Y + 5; y++)
    for (let x = QUEEN_X - 5; x <= QUEEN_X + 5; x++)
      if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H)
        col.grid[y][x].revealed = true;

  col.tunnelCount = 0;
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++)
      if (col.grid[y][x].type === "tunnel" || col.grid[y][x].type === "chamber")
        col.tunnelCount++;
}

function revealAround(col, gx, gy) {
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const nx = gx + dx, ny = gy + dy;
      if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H)
        col.grid[ny][nx].revealed = true;
    }
}

function completeDig(col, gx, gy) {
  col.grid[gy][gx].type = "tunnel";
  col.grid[gy][gx].grains = 0;
  col.tunnelCount++;
  revealAround(col, gx, gy);
  // Resurs avslöjad?
  if (col.grid[gy][gx].resource) showToastGlobal(col.grid[gy][gx].resource.label);
}

// Tunnelregel: 2×2
function wouldCreate2x2(col, gx, gy) {
  for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
    const bx = gx + dx, by = gy + dy;
    let openCount = 0, chamberCount = 0;
    for (let cy = 0; cy < 2; cy++)
      for (let cx = 0; cx < 2; cx++) {
        const tx = bx + cx, ty = by + cy;
        if (tx < 0 || tx >= GRID_W || ty < 0 || ty >= GRID_H) continue;
        const tile = col.grid[ty][tx];
        if (tx === gx && ty === gy) { openCount++; continue; }
        if (tile.type === "tunnel" || tile.type === "chamber" || tile.type === "surface") openCount++;
        if (tile.type === "chamber") chamberCount++;
      }
    if (openCount >= 4 && chamberCount < 3) return true;
  }
  return false;
}

function canDigAt(col, gx, gy) {
  if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return false;
  if (gy === SURFACE_Y) return false;
  const tile = col.grid[gy][gx];
  if (tile.type !== "dirt") return false;
  // Nära ytan (rad 1-2): max var 3:e ruta, inte intill ingången
  if (gy <= 2) {
    if (Math.abs(gx - ENTRANCE_X) <= 1) return false; // skydda runt ingången
    // Kolla om det redan finns en tunnel inom 2 rutor horisontellt
    for (let dx = -2; dx <= 2; dx++) {
      if (dx === 0) continue;
      const nx = gx + dx;
      if (nx >= 0 && nx < GRID_W && col.grid[gy][nx].type === "tunnel") return false;
    }
  }
  if (wouldCreate2x2(col, gx, gy)) return false;
  return true;
}

// === BFS ===
function isWalkable(type) { return type === "tunnel" || type === "chamber" || type === "surface"; }

function findPath(col, sx, sy, ex, ey) {
  if (sx === ex && sy === ey) return [{ x: ex, y: ey }];
  const visited = new Set();
  const queue = [{ x: sx, y: sy, path: [] }];
  visited.add(sy * GRID_W + sx);
  let steps = 0;
  while (queue.length > 0 && steps < 600) {
    const curr = queue.shift(); steps++;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = curr.x + dx, ny = curr.y + dy;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
      const key = ny * GRID_W + nx;
      if (visited.has(key)) continue;
      if (!isWalkable(col.grid[ny][nx].type)) continue;
      visited.add(key);
      const newPath = [...curr.path, { x: nx, y: ny }];
      if (nx === ex && ny === ey) return newPath;
      queue.push({ x: nx, y: ny, path: newPath });
    }
  }
  return null;
}

function findDigPath(col, targetX, targetY) {
  const grid = col.grid;
  if (isWalkable(grid[targetY][targetX].type)) return [];
  if (grid[targetY][targetX].type === "rock") return null;
  if (targetY === SURFACE_Y) return null;
  const visited = new Set();
  const queue = [];
  // Starta BFS från underjordiska tunnlar (inte ytan)
  for (let y = 1; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++)
      if (grid[y][x].type === "tunnel" || grid[y][x].type === "chamber") {
        visited.add(y * GRID_W + x);
        queue.push({ x, y, path: [] });
      }
  // Markera ytan som besökt (blockera BFS från att gå via den)
  for (let x = 0; x < GRID_W; x++) visited.add(SURFACE_Y * GRID_W + x);
  let steps = 0;
  while (queue.length > 0 && steps < 800) {
    const curr = queue.shift(); steps++;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = curr.x + dx, ny = curr.y + dy;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
      if (ny === SURFACE_Y) continue;
      const key = ny * GRID_W + nx;
      if (visited.has(key)) continue;
      if (grid[ny][nx].type === "rock") continue;
      if (grid[ny][nx].type === "dirt" && wouldCreate2x2(col, nx, ny)) continue;
      visited.add(key);
      const newPath = [...curr.path, { x: nx, y: ny }];
      if (nx === targetX && ny === targetY)
        return newPath.filter(p => grid[p.y][p.x].type === "dirt");
      queue.push({ x: nx, y: ny, path: newPath });
    }
  }
  return null;
}

function maxDigPlans(col) { return Math.max(1, Math.floor(col.antCount / 3)); }

function randomTunnelTile(col) {
  const tunnels = [];
  for (let y = 1; y < GRID_H; y++) // exkludera ytan
    for (let x = 0; x < GRID_W; x++)
      if (col.grid[y][x].type === "tunnel" || col.grid[y][x].type === "chamber")
        tunnels.push({ x, y });
  return tunnels.length ? tunnels[Math.floor(Math.random() * tunnels.length)] : null;
}

function findNearestResource(col, sx, sy) {
  const visited = new Set();
  const queue = [{ x: sx, y: sy }];
  visited.add(sy * GRID_W + sx);
  let steps = 0;
  while (queue.length > 0 && steps < 300) {
    const curr = queue.shift(); steps++;
    const tile = col.grid[curr.y][curr.x];
    if (tile.resource && tile.resource.tripsLeft > 0 && isWalkable(tile.type))
      return { x: curr.x, y: curr.y };
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = curr.x + dx, ny = curr.y + dy;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
      const key = ny * GRID_W + nx;
      if (visited.has(key)) continue;
      if (!isWalkable(col.grid[ny][nx].type)) continue;
      visited.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

function tileColor(col, gx, gy) {
  const tile = col.grid[gy][gx];
  if (tile.type === "surface") return COL_SURFACE;
  if (!tile.revealed) return COL_FOG;
  switch (tile.type) {
    case "dirt": {
      const v = tile.rockVariant * 15;
      // Visa grävprogress: ljusare ju färre korn kvar
      if (tile.grains < tile.grainsMax && tile.grainsMax > 0) {
        const progress = 1 - (tile.grains / tile.grainsMax);
        const boost = progress * 40;
        return [COL_DIRT[0] + v + boost, COL_DIRT[1] + v + boost, COL_DIRT[2] + v + boost];
      }
      return [COL_DIRT[0] + v, COL_DIRT[1] + v, COL_DIRT[2] + v];
    }
    case "tunnel": return COL_TUNNEL;
    case "chamber": return COL_CHAMBER;
    case "rock": {
      const v = tile.rockVariant * 10;
      return [COL_ROCK[0] + v, COL_ROCK[1] + v, COL_ROCK[2] + v];
    }
    default: return COL_DIRT;
  }
}

// Global toast (used by completeDig)
let showToastGlobal = () => {};

// === SANDHÖGAR ===
// Myror dumpar vid närmaste yta-ruta. Högar växer per ruta.
const PILE_MAX = 20; // max per ruta, sen sprider det sig

function findNearestSurface(col, sx, sy) {
  // BFS till närmaste surface-ruta (inte ingångshålet — den är tunnel)
  const visited = new Set();
  const queue = [{ x: sx, y: sy, path: [] }];
  visited.add(sy * GRID_W + sx);
  let steps = 0;
  while (queue.length > 0 && steps < 600) {
    const curr = queue.shift(); steps++;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = curr.x + dx, ny = curr.y + dy;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
      const key = ny * GRID_W + nx;
      if (visited.has(key)) continue;
      const tile = col.grid[ny][nx];
      if (!isWalkable(tile.type) && tile.type !== "surface") continue;
      visited.add(key);
      const newPath = [...curr.path, { x: nx, y: ny }];
      if (tile.type === "surface") return { path: newPath, x: nx, y: ny };
      queue.push({ x: nx, y: ny, path: newPath });
    }
  }
  // Fallback: ingången
  return { path: null, x: ENTRANCE_X, y: SURFACE_Y };
}

function addSandToPile(col, x) {
  let pile = col.sandPiles.find(p => p.x === x);
  if (!pile) { pile = { x, amount: 0 }; col.sandPiles.push(pile); }
  if (pile.amount >= PILE_MAX) {
    // Sprid till grann-ruta
    const side = (x <= ENTRANCE_X) ? x - 1 : x + 1;
    const nx = Math.max(0, Math.min(GRID_W - 1, side));
    if (nx !== x) return addSandToPile(col, nx);
  }
  pile.amount++;
  col.sandTotal++;
}

// === SCENER ===
scene("menu", () => {
  add([text("MYRKOLONIN", { size: 48 }), pos(center()), anchor("center"),
    color(COL_QUEEN[0], COL_QUEEN[1], COL_QUEEN[2])]);
  add([text("Bygg ditt underjordiska imperium", { size: 18 }),
    pos(center().x, center().y + 45), anchor("center"), color(WHITE), opacity(0.6)]);
  add([text("Tryck för att börja", { size: 20 }),
    pos(center().x, center().y + 100), anchor("center"), color(WHITE), opacity(0.5)]);

  const best = localStorage.getItem("antcolony_best");
  if (best) {
    const data = JSON.parse(best);
    add([text(`Bästa: ${data.score} poäng`, { size: 16 }),
      pos(center().x, center().y + 140), anchor("center"), color(255, 220, 100), opacity(0.7)]);
  }
  onClick(() => go("game"));
  onKeyPress("space", () => go("game"));
});

scene("game", () => {
  colony = createColony();
  initGrid(colony);
  colony.startTime = time();

  // Toast
  let toastText = "", toastTimer = 0;
  function showToast(msg) { toastText = msg; toastTimer = 2.5; }
  showToastGlobal = showToast;

  // Kamera
  let camX = QUEEN_X * TILE + TILE / 2;
  let camY = QUEEN_Y * TILE + TILE / 2;
  let zoomLevel = ZOOM_DEFAULT;
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0, dragCamStartX = 0, dragCamStartY = 0, dragDist = 0;
  let lastTapTime = 0, lastTapGx = -1, lastTapGy = -1;

  // Pinch
  let pinchStartDist = 0, pinchStartZoom = 1, isPinching = false, touches = {};
  const canvas = document.querySelector("canvas");
  canvas.addEventListener("touchstart", (e) => {
    for (const t of e.changedTouches) touches[t.identifier] = { x: t.clientX, y: t.clientY };
    const ids = Object.keys(touches);
    if (ids.length >= 2) { isPinching = true; const t1 = touches[ids[0]], t2 = touches[ids[1]]; pinchStartDist = Math.hypot(t2.x - t1.x, t2.y - t1.y); pinchStartZoom = zoomLevel; }
  }, { passive: true });
  canvas.addEventListener("touchmove", (e) => {
    for (const t of e.changedTouches) if (touches[t.identifier]) touches[t.identifier] = { x: t.clientX, y: t.clientY };
    const ids = Object.keys(touches);
    if (isPinching && ids.length >= 2) { const t1 = touches[ids[0]], t2 = touches[ids[1]]; zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinchStartZoom * Math.hypot(t2.x - t1.x, t2.y - t1.y) / pinchStartDist)); }
  }, { passive: true });
  canvas.addEventListener("touchend", (e) => { for (const t of e.changedTouches) delete touches[t.identifier]; if (Object.keys(touches).length < 2) isPinching = false; }, { passive: true });
  canvas.addEventListener("touchcancel", (e) => { for (const t of e.changedTouches) delete touches[t.identifier]; if (Object.keys(touches).length < 2) isPinching = false; }, { passive: true });
  onScroll((delta) => { if (delta.y > 0) zoomLevel = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP); else if (delta.y < 0) zoomLevel = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP); });

  // === MYROR ===
  const antEntities = [];

  function spawnAnt(gx, gy) {
    const ant = add([
      circle(3), pos(gx * TILE + TILE / 2, gy * TILE + TILE / 2),
      anchor("center"), color(COL_ANT[0], COL_ANT[1], COL_ANT[2]), z(10), "ant",
      {
        gridX: gx, gridY: gy, path: null, pathIdx: 0, speed: 60,
        state: "idle", digTarget: null, replanTimer: 0,
        carrying: null,         // resurs
        carrySand: false,       // bär sand?
        resourceSource: null,   // {x,y} var resursen hämtades
      },
    ]);
    const head = add([circle(2), pos(ant.pos.x + 4, ant.pos.y - 2), anchor("center"),
      color(COL_ANT[0] + 20, COL_ANT[1] + 15, COL_ANT[2] + 10), z(11)]);
    antEntities.push({ ant, head });
    colony.antCount++;
    return ant;
  }

  for (const [sx, sy] of [[QUEEN_X - 1, QUEEN_Y], [QUEEN_X + 1, QUEEN_Y], [QUEEN_X, QUEEN_Y + 1]])
    spawnAnt(sx, sy);

  // Drottning
  const queen = add([circle(5), pos(QUEEN_X * TILE + TILE / 2, QUEEN_Y * TILE + TILE / 2),
    anchor("center"), color(COL_QUEEN[0], COL_QUEEN[1], COL_QUEEN[2]), z(15)]);
  const crown = add([circle(2.5), pos(queen.pos.x, queen.pos.y - 7),
    anchor("center"), color(255, 210, 60), z(16)]);
  let queenPulse = 0;

  // === ÄGG ===
  function layEgg() {
    const cost = EGG_COST.worker;
    if (colony.food < cost.food || colony.protein < cost.protein) return;
    const spots = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const ex = QUEEN_X + dx, ey = QUEEN_Y + dy;
        if (!colony.eggs.some(e => e.x === ex && e.y === ey)) spots.push({ x: ex, y: ey });
      }
    if (spots.length === 0) return;
    colony.food -= cost.food; colony.protein -= cost.protein;
    const spot = spots[Math.floor(Math.random() * spots.length)];
    const eggEntity = add([circle(2.5), pos(spot.x * TILE + TILE / 2, spot.y * TILE + TILE / 2),
      anchor("center"), color(COL_EGG[0], COL_EGG[1], COL_EGG[2]), z(12), opacity(0.9)]);
    colony.eggs.push({ x: spot.x, y: spot.y, age: 0, entity: eggEntity });
  }

  function hatchEgg(egg) {
    if (egg.entity) destroy(egg.entity);
    colony.eggs = colony.eggs.filter(e => e !== egg);
    spawnAnt(egg.x, egg.y);
    for (let i = 0; i < 5; i++)
      add([circle(rand(1, 2)), pos(egg.x * TILE + TILE / 2 + rand(-8, 8), egg.y * TILE + TILE / 2 + rand(-8, 8)),
        color(COL_EGG[0], COL_EGG[1], COL_EGG[2]), opacity(0.9), z(20), lifespan(0.5, { fade: 0.3 }), move(rand(0, 360), rand(15, 40))]);
  }

  function updateEggs(elapsed) {
    for (const egg of [...colony.eggs]) {
      egg.age += elapsed;
      if (egg.entity) {
        if (egg.age >= EGG_MIN_HATCH) {
          egg.entity.color = rgb(COL_EGG_READY[0], COL_EGG_READY[1], COL_EGG_READY[2]);
          egg.entity.opacity = Math.sin(egg.age * 4) * 0.15 + 0.85;
          egg.entity.radius = 2.5 + Math.sin(egg.age * 3) * 0.5;
        } else { egg.entity.radius = 1.5 + (egg.age / EGG_MIN_HATCH); }
      }
      if (egg.age >= EGG_AUTO_HATCH) hatchEgg(egg);
    }
  }

  // === GRÄVPLAN — sandkorn-version ===
  // digPlan: lista av {x, y} rutor som behöver grävas klart
  // Alla lediga myror plockar sand från första rutan i planen

  function addDigPlan(targetX, targetY) {
    const path = findDigPath(colony, targetX, targetY);
    if (!path || path.length === 0) return;
    const maxPlans = maxDigPlans(colony);
    if (colony.digPlan.length >= maxPlans * 8) {
      showToast(`Max ${maxPlans} grävplaner (${colony.antCount} myror)`);
      return;
    }
    for (const p of path) {
      if (!colony.digPlan.some(d => d.x === p.x && d.y === p.y))
        colony.digPlan.push({ x: p.x, y: p.y });
    }
  }

  // Hitta närmaste grävbar ruta i planen som har intilliggande tunnel
  function findDiggableInPlan() {
    for (let i = 0; i < colony.digPlan.length; i++) {
      const p = colony.digPlan[i];
      const tile = colony.grid[p.y][p.x];
      if (tile.type !== "dirt" || tile.grains <= 0) {
        colony.digPlan.splice(i, 1); i--; continue; // redan grävd, ta bort
      }
      // Kolla att nåbar (intill tunnel)
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = p.x + dx, ny = p.y + dy;
        if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H && isWalkable(colony.grid[ny][nx].type))
          return p;
      }
    }
    return null;
  }

  // === MYRLOGIK ===
  function antSpeed(ant) { return ant.speed * (colony.dehydrated ? DEHYDRATION_SPEED : 1); }

  function updateAnts(elapsed) {
    // Räkna hur många som redan gräver
    const diggingCount = antEntities.filter(e =>
      e.ant.state === "goingToDig" || e.ant.state === "carryingSand" || e.ant.state === "digging"
    ).length;
    let newDiggers = 0;
    // Max ~70% av myror gräver, resten hämtar resurser
    const maxDiggers = Math.max(1, Math.ceil(colony.antCount * 0.7));

    for (const entry of antEntities) {
      const ant = entry.ant;
      ant.replanTimer -= elapsed;

      // IDLE
      if (ant.state === "idle" && ant.replanTimer <= 0) {
        // Prioritet 1: grävplan (om det finns plats)
        const canAssignDig = (diggingCount + newDiggers) < maxDiggers;
        const digTarget = canAssignDig ? findDiggableInPlan() : null;
        if (digTarget && !ant.carrying && !ant.carrySand) {
          // Hitta intilliggande tunnel att stå på
          let bestPath = null;
          for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            const nx = digTarget.x + dx, ny = digTarget.y + dy;
            if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H && isWalkable(colony.grid[ny][nx].type)) {
              const p = findPath(colony, ant.gridX, ant.gridY, nx, ny);
              if (p && (!bestPath || p.length < bestPath.length)) bestPath = p;
            }
          }
          if (bestPath) {
            ant.path = bestPath; ant.pathIdx = 0;
            ant.state = "goingToDig"; ant.digTarget = { x: digTarget.x, y: digTarget.y }; newDiggers++;
            ant.replanTimer = 8;
            continue;
          }
        }
        // Prioritet 2: hämta resurs
        if (!ant.carrying && !ant.carrySand) {
          const res = findNearestResource(colony, ant.gridX, ant.gridY);
          if (res) {
            const path = findPath(colony, ant.gridX, ant.gridY, res.x, res.y);
            if (path) { ant.path = path; ant.pathIdx = 0; ant.state = "goingToResource"; ant.replanTimer = 5; continue; }
          }
        }
        // Prioritet 3: vandra
        const target = randomTunnelTile(colony);
        if (target) {
          const path = findPath(colony, ant.gridX, ant.gridY, target.x, target.y);
          if (path && path.length > 1) { ant.path = path; ant.pathIdx = 0; ant.state = "walking"; }
        }
        ant.replanTimer = 2 + Math.random() * 3;
      }

      // WALKING
      if (ant.state === "walking") {
        if (ant.path && ant.pathIdx < ant.path.length) moveAnt(ant, elapsed);
        else { ant.state = "idle"; ant.path = null; ant.replanTimer = 1 + Math.random() * 2; }
      }

      // GOING TO DIG — gå till grävplats, plocka ett sandkorn
      if (ant.state === "goingToDig") {
        if (ant.path && ant.pathIdx < ant.path.length) {
          moveAnt(ant, elapsed);
        } else {
          // Framme intill rutan — plocka sand
          const tgt = ant.digTarget;
          if (tgt && colony.grid[tgt.y][tgt.x].type === "dirt" && colony.grid[tgt.y][tgt.x].grains > 0) {
            colony.grid[tgt.y][tgt.x].grains--;
            colony.grid[tgt.y][tgt.x].revealed = true;
            revealAround(colony, tgt.x, tgt.y);

            if (colony.grid[tgt.y][tgt.x].grains <= 0) {
              // Rutan klar! Bli tunnel
              completeDig(colony, tgt.x, tgt.y);
              // Partiklar
              for (let i = 0; i < 4; i++)
                add([circle(rand(1, 2)), pos(tgt.x * TILE + TILE / 2 + rand(-8, 8), tgt.y * TILE + TILE / 2 + rand(-8, 8)),
                  color(COL_DIRT[0] + rand(0, 30), COL_DIRT[1] + rand(0, 20), COL_DIRT[2]),
                  opacity(1), z(20), lifespan(0.4, { fade: 0.3 }), move(rand(0, 360), rand(15, 40))]);
            }

            // Bär sandkorn till närmaste yta-ruta
            ant.carrySand = true;
            ant.digTarget = null;
            const surface = findNearestSurface(colony, ant.gridX, ant.gridY);
            if (surface.path) { ant.path = surface.path; ant.pathIdx = 0; ant.state = "carryingSand"; }
            else { ant.carrySand = false; ant.state = "idle"; ant.replanTimer = 0.5; }
          } else {
            // Rutan redan klar
            ant.digTarget = null; ant.state = "idle"; ant.path = null; ant.replanTimer = 0.3;
          }
        }
      }

      // CARRYING SAND — bär till ytan
      if (ant.state === "carryingSand") {
        if (ant.path && ant.pathIdx < ant.path.length) {
          moveAnt(ant, elapsed);
        } else {
          // Dumpa sand på hög
          ant.carrySand = false;
          addSandToPile(colony, ant.gridX);
          add([circle(rand(1, 2)), pos(ant.pos.x + rand(-6, 6), ant.pos.y + rand(-4, 4)),
            color(COL_SAND_PILE[0], COL_SAND_PILE[1], COL_SAND_PILE[2]),
            opacity(0.8), z(5), lifespan(0.5, { fade: 0.3 }), move(DOWN, 10)]);
          ant.state = "idle"; ant.path = null; ant.replanTimer = 0.2;
        }
      }

      // GOING TO RESOURCE
      if (ant.state === "goingToResource") {
        if (ant.path && ant.pathIdx < ant.path.length) { moveAnt(ant, elapsed); }
        else {
          const tile = colony.grid[ant.gridY][ant.gridX];
          if (tile.resource && tile.resource.tripsLeft > 0) {
            const res = tile.resource;
            ant.carrying = { kind: res.kind, food: res.food, protein: res.protein, water: res.water, color: res.color, label: res.label };
            ant.resourceSource = { x: ant.gridX, y: ant.gridY };
            res.tripsLeft--;
            if (res.tripsLeft <= 0) tile.resource = null;
            ant.state = "returning";
            const path = findPath(colony, ant.gridX, ant.gridY, QUEEN_X, QUEEN_Y);
            if (path) { ant.path = path; ant.pathIdx = 0; }
            else { ant.state = "idle"; ant.carrying = null; ant.replanTimer = 1; }
          } else { ant.state = "idle"; ant.path = null; ant.replanTimer = 0.5; }
        }
      }

      // RETURNING
      if (ant.state === "returning") {
        if (ant.path && ant.pathIdx < ant.path.length) { moveAnt(ant, elapsed); }
        else {
          if (ant.carrying) {
            const res = ant.carrying;
            if (res.kind === "honungsdagg") {
              if (!colony.aphidFarms.some(f => f.x === ant.gridX && f.y === ant.gridY))
                colony.aphidFarms.push({ x: ant.gridX, y: ant.gridY, timer: 0 });
              showToast("Bladlöss-farm!");
            } else { colony.food += res.food; colony.protein += res.protein; colony.water += res.water; }
            add([text(`+${res.label}`, { size: 10 }), pos(ant.pos.x, ant.pos.y - 10),
              anchor("center"), color(res.color[0], res.color[1], res.color[2]),
              z(25), opacity(1), lifespan(1, { fade: 0.5 }), move(UP, 20)]);
            ant.carrying = null;
          }
          ant.state = "idle"; ant.path = null; ant.replanTimer = 0.3;
        }
      }

      // Visuellt
      const isCarrying = ant.carrying || ant.carrySand;
      entry.ant.color = isCarrying ? rgb(COL_ANT_CARRY[0], COL_ANT_CARRY[1], COL_ANT_CARRY[2]) : rgb(COL_ANT[0], COL_ANT[1], COL_ANT[2]);
      if (entry.head) { entry.head.pos.x = ant.pos.x + 4; entry.head.pos.y = ant.pos.y - 2; }
    }
  }

  function moveAnt(ant, elapsed) {
    const target = ant.path[ant.pathIdx];
    const tx = target.x * TILE + TILE / 2, ty = target.y * TILE + TILE / 2;
    const dx = tx - ant.pos.x, dy = ty - ant.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) { ant.gridX = target.x; ant.gridY = target.y; ant.pathIdx++; }
    else { const spd = antSpeed(ant) * elapsed; ant.pos.x += (dx / dist) * spd; ant.pos.y += (dy / dist) * spd; }
  }

  // === BLADLÖSS & VATTEN & DROTTNING ===
  function updateAphids(elapsed) {
    for (const farm of colony.aphidFarms) {
      farm.timer += elapsed;
      if (farm.timer >= 10) { farm.timer -= 10; colony.food++;
        add([text("+1", { size: 10 }), pos(farm.x * TILE + TILE / 2, farm.y * TILE + TILE / 2 - 8),
          anchor("center"), color(180, 220, 80), z(25), opacity(1), lifespan(1, { fade: 0.5 }), move(UP, 15)]); }
    }
  }
  function updateWater(elapsed) {
    colony.waterTimer -= elapsed;
    if (colony.waterTimer <= 0) {
      colony.waterTimer = WATER_USE_INTERVAL;
      if (colony.water > 0) colony.water--;
      else if (!colony.dehydrated) { colony.dehydrated = true; showToast("Uttorkad! Myror rör sig långsammare"); }
    }
    if (colony.water > 0) colony.dehydrated = false;
  }
  colony.queenTimer = colony.queenInterval;
  function updateQueen(elapsed) {
    colony.queenTimer -= elapsed; queenPulse += elapsed * 2;
    queen.radius = 5 + Math.sin(queenPulse) * 0.8;
    crown.pos.y = queen.pos.y - 7 + Math.sin(queenPulse) * 0.8;
    if (colony.queenTimer <= 0) { colony.queenTimer = colony.queenInterval; layEgg(); }
  }

  // === KAMERA ===
  const HUD_HEIGHT = 72; // pixlar som HUD tar
  function clampCam() {
    const hw = (width() / 2) / zoomLevel, hh = (height() / 2) / zoomLevel;
    const hudOffset = (HUD_HEIGHT / 2) / zoomLevel;
    camX = Math.max(0, Math.min(WORLD_W, camX));
    camY = Math.max(hudOffset, Math.min(WORLD_H, camY));
  }
  function screenToWorld(sx, sy) { return { x: (sx - width() / 2) / zoomLevel + camX, y: (sy - height() / 2) / zoomLevel + camY }; }

  onMousePress(() => { if (isPinching) return; isDragging = true; dragStartX = mousePos().x; dragStartY = mousePos().y; dragCamStartX = camX; dragCamStartY = camY; dragDist = 0; });
  onMouseMove(() => { if (!isDragging || isPinching) return; const dx = mousePos().x - dragStartX, dy = mousePos().y - dragStartY; dragDist = Math.hypot(dx, dy); camX = dragCamStartX - dx / zoomLevel; camY = dragCamStartY - dy / zoomLevel; clampCam(); });
  onMouseRelease(() => {
    if (isPinching) { isDragging = false; return; }
    if (dragDist < 8) {
      const now = time();
      const world = screenToWorld(mousePos().x, mousePos().y);
      const gx = Math.floor(world.x / TILE), gy = Math.floor(world.y / TILE);
      if (gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H) {
        const egg = colony.eggs.find(e => e.x === gx && e.y === gy && e.age >= EGG_MIN_HATCH);
        if (egg) { hatchEgg(egg); }
        // Avbryt grävplan: singeltap på planerad ruta
        else if (colony.digPlan.some(d => d.x === gx && d.y === gy)) {
          colony.digPlan = colony.digPlan.filter(d => d.x !== gx && d.y !== gy);
          showToast("Grävplan borttagen");
        }
        else {
          const tile = colony.grid[gy][gx];
          if ((tile.type === "dirt" || !tile.revealed) && gy > SURFACE_Y) {
            const timeSinceLast = (now - lastTapTime) * 1000;
            const sameArea = Math.abs(gx - lastTapGx) <= 1 && Math.abs(gy - lastTapGy) <= 1;
            if (timeSinceLast < DOUBLE_TAP_MS && sameArea) { addDigPlan(gx, gy); lastTapTime = 0; }
            else { lastTapTime = now; lastTapGx = gx; lastTapGy = gy; }
          }
        }
      }
    }
    isDragging = false;
  });

  // === HUD ===
  const w = width();
  const fs = Math.max(12, Math.min(16, w / 35));
  const hy = 6;
  add([rect(w, 72), pos(0, 0), fixed(), color(0, 0, 0), opacity(0.6), z(100)]);
  const hudScore = add([text("Koloni: 0", { size: fs }), pos(10, hy), fixed(), color(255, 220, 100), z(101)]);
  const hudAnts = add([text("Myror: 3", { size: fs }), pos(w * 0.35, hy), fixed(), color(WHITE), z(101)]);
  const hudTime = add([text("0:00", { size: fs }), pos(w * 0.7, hy), fixed(), color(WHITE), opacity(0.7), z(101)]);
  const hudSugar = add([text("Socker: 8", { size: fs }), pos(10, hy + 20), fixed(), color(220, 180, 100), z(101)]);
  const hudProtein = add([text("Protein: 4", { size: fs }), pos(w * 0.35, hy + 20), fixed(), color(80, 160, 80), z(101)]);
  const hudWater = add([text("Vatten: 8", { size: fs }), pos(w * 0.7, hy + 20), fixed(), color(100, 160, 220), z(101)]);
  const hudEggs = add([text("", { size: fs }), pos(10, hy + 40), fixed(), color(COL_EGG_READY[0], COL_EGG_READY[1], COL_EGG_READY[2]), z(101)]);

  // Zoom & Hem knappar
  const zoomInBtn = add([rect(36, 36, { radius: 4 }), pos(w - 46, height() - 90), fixed(), color(80, 60, 40), opacity(0.7), z(101), area()]);
  add([text("+", { size: 22 }), pos(w - 28, height() - 72), fixed(), anchor("center"), color(WHITE), z(102)]);
  zoomInBtn.onClick(() => { zoomLevel = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP); });
  const zoomOutBtn = add([rect(36, 36, { radius: 4 }), pos(w - 46, height() - 48), fixed(), color(80, 60, 40), opacity(0.7), z(101), area()]);
  add([text("−", { size: 22 }), pos(w - 28, height() - 30), fixed(), anchor("center"), color(WHITE), z(102)]);
  zoomOutBtn.onClick(() => { zoomLevel = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP); });
  const homeBtn = add([rect(50, 28, { radius: 4 }), pos(w - 60, 4), fixed(), color(80, 60, 40), opacity(0.7), z(101), area()]);
  add([text("Hem", { size: 14 }), pos(w - 35, 10), fixed(), anchor("center"), color(WHITE), z(102)]);
  homeBtn.onClick(() => { camX = QUEEN_X * TILE + TILE / 2; camY = QUEEN_Y * TILE + TILE / 2; zoomLevel = ZOOM_DEFAULT; });

  const toastLabel = add([text("", { size: 14 }), pos(center().x, height() - 40), fixed(), anchor("center"), color(255, 200, 80), opacity(0), z(103)]);
  let hoverGx = -1, hoverGy = -1;

  // === MAIN LOOP ===
  onUpdate(() => {
    const elapsed = dt();
    camPos(camX, camY); camScale(zoomLevel);
    updateAnts(elapsed); updateQueen(elapsed); updateEggs(elapsed); updateAphids(elapsed); updateWater(elapsed);

    const score = colony.antCount * 10 + colony.tunnelCount * 2;
    hudScore.text = `Koloni: ${score}`;
    hudAnts.text = `Myror: ${colony.antCount}`;
    const readyEggs = colony.eggs.filter(e => e.age >= EGG_MIN_HATCH).length;
    hudEggs.text = colony.eggs.length > 0 ? `Ägg: ${readyEggs}/${colony.eggs.length}` : "";
    const sec = Math.floor(time() - colony.startTime);
    hudTime.text = `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;
    hudSugar.text = `Socker: ${colony.food}`;
    hudProtein.text = `Protein: ${colony.protein}`;
    hudWater.text = `Vatten: ${colony.water}`;
    hudWater.color = colony.dehydrated ? rgb(255, 80, 80) : rgb(100, 160, 220);

    if (toastTimer > 0) { toastTimer -= elapsed; toastLabel.text = toastText; toastLabel.opacity = Math.min(1, toastTimer * 2); }
    else toastLabel.opacity = 0;

    if (!isDragging) { const world = screenToWorld(mousePos().x, mousePos().y); hoverGx = Math.floor(world.x / TILE); hoverGy = Math.floor(world.y / TILE); }
  });

  // === RITA ===
  onDraw(() => {
    const hw = (width() / 2) / zoomLevel, hh = (height() / 2) / zoomLevel;
    const startX = Math.max(0, Math.floor((camX - hw) / TILE));
    const startY = Math.max(0, Math.floor((camY - hh) / TILE));
    const endX = Math.min(GRID_W - 1, Math.ceil((camX + hw) / TILE));
    const endY = Math.min(GRID_H - 1, Math.ceil((camY + hh) / TILE));

    // Himmel ovanför kartan
    if (startY === 0) {
      drawRect({ pos: vec2(0, -TILE * 3), width: WORLD_W, height: TILE * 3, color: rgb(COL_SKY[0], COL_SKY[1], COL_SKY[2]) });
    }

    const planSet = new Set();
    for (const p of colony.digPlan) planSet.add(p.y * GRID_W + p.x);
    const aphidSet = new Set();
    for (const f of colony.aphidFarms) aphidSet.add(f.y * GRID_W + f.x);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const tc = tileColor(colony, x, y);
        const px = x * TILE, py = y * TILE;
        drawRect({ pos: vec2(px, py), width: TILE, height: TILE, color: rgb(tc[0], tc[1], tc[2]) });

        const tile = colony.grid[y][x];

        // Sandkorn-prickar på halvgrävda rutor
        if (tile.type === "dirt" && tile.revealed && tile.grains < tile.grainsMax && tile.grains > 0) {
          for (let g = 0; g < tile.grains; g++) {
            const gx2 = px + 6 + (g % 3) * 10;
            const gy2 = py + 8 + Math.floor(g / 3) * 12;
            drawCircle({ pos: vec2(gx2, gy2), radius: 2, color: rgb(80, 55, 30), opacity: 0.6 });
          }
        }

        if (tile.revealed && isWalkable(tile.type) && tile.type !== "surface") {
          drawRect({ pos: vec2(px, py), width: TILE, height: TILE, outline: { width: 0.5, color: rgb(0, 0, 0) }, fill: false, opacity: 0.15 });
        }

        if (tile.type === "chamber") {
          drawRect({ pos: vec2(px + 1, py + 1), width: TILE - 2, height: TILE - 2, outline: { width: 1, color: rgb(200, 170, 60) }, fill: false, opacity: 0.3 });
        }

        // Ingångshål
        if (x === ENTRANCE_X && y === ENTRANCE_Y) {
          drawCircle({ pos: vec2(px + TILE / 2, py + TILE / 2), radius: 6, color: rgb(40, 25, 15), opacity: 0.8 });
        }

        // Resurs
        if (tile.resource && tile.resource.tripsLeft > 0 && tile.revealed && isWalkable(tile.type)) {
          const rc = tile.resource.color;
          const rad = 2 + (tile.resource.tripsLeft / tile.resource.tripsMax) * 4;
          drawCircle({ pos: vec2(px + TILE / 2, py + TILE / 2), radius: rad, color: rgb(rc[0], rc[1], rc[2]), opacity: 0.9 });
        }

        // Bladlöss-farm
        if (aphidSet.has(y * GRID_W + x)) {
          const pulse = Math.sin(time() * 3 + x + y) * 0.15 + 0.85;
          drawCircle({ pos: vec2(px + TILE / 2, py + TILE / 2), radius: 5, color: rgb(180, 220, 80), opacity: pulse * 0.5 });
          drawCircle({ pos: vec2(px + TILE / 2, py + TILE / 2), radius: 2, color: rgb(120, 180, 40), opacity: pulse });
        }

        // Grävplan
        if (planSet.has(y * GRID_W + x)) {
          drawRect({ pos: vec2(px + 2, py + 2), width: TILE - 4, height: TILE - 4, outline: { width: 2, color: rgb(COL_PLAN[0], COL_PLAN[1], COL_PLAN[2]) }, fill: false, opacity: 0.7 });
        }

        // Tap-markering
        if (x === lastTapGx && y === lastTapGy && (time() - lastTapTime) < DOUBLE_TAP_MS / 1000) {
          drawRect({ pos: vec2(px + 1, py + 1), width: TILE - 2, height: TILE - 2, outline: { width: 2, color: rgb(255, 255, 255) }, fill: false, opacity: 0.6 });
        }
      }
    }

    // Sandhögar på ytan (trianglar/kuller)
    for (const pile of colony.sandPiles) {
      if (pile.amount <= 0) continue;
      const cx = pile.x * TILE + TILE / 2;
      const baseY = SURFACE_Y * TILE + TILE; // marklinje
      const h = Math.min(TILE * 1.2, 4 + pile.amount * 1.5); // höjd
      const w = Math.min(TILE * 1.5, 8 + pile.amount * 2);   // bas-bredd
      // Rita triangel-hög
      drawTriangle({
        p1: vec2(cx, baseY - h),       // topp
        p2: vec2(cx - w / 2, baseY),   // vänster bas
        p3: vec2(cx + w / 2, baseY),   // höger bas
        color: rgb(COL_SAND_PILE[0], COL_SAND_PILE[1], COL_SAND_PILE[2]),
        opacity: 0.85,
      });
      // Ljusare highlight på en sida
      drawTriangle({
        p1: vec2(cx - 1, baseY - h + 2),
        p2: vec2(cx - w / 2 + 3, baseY),
        p3: vec2(cx, baseY),
        color: rgb(COL_SAND_PILE[0] + 20, COL_SAND_PILE[1] + 15, COL_SAND_PILE[2] + 10),
        opacity: 0.3,
      });
    }
  });
});

go("menu");
