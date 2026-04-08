// === MYRKOLONIN — Fas 2: Resurser + Ekonomi ===

// --- KONSTANTER ---
const TILE = 32;
const GRID_W = 40;
const GRID_H = 40;
const QUEEN_X = 20;
const QUEEN_Y = 20;
const WORLD_W = GRID_W * TILE;
const WORLD_H = GRID_H * TILE;
const DIG_REACH_PER_ANT = 3;

// Ägg
const EGG_LAY_INTERVAL = 15;
const EGG_MIN_HATCH = 3;
const EGG_AUTO_HATCH = 15;
// Ägg-kostnader definieras i EGG_COST nedan

// Zoom
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 2.0;
const ZOOM_DEFAULT = 1.0;
const ZOOM_STEP = 0.15;

// Vatten
const WATER_USE_INTERVAL = 30;  // sek per vattenförbrukning
const DEHYDRATION_SPEED = 0.5;  // hastighets-multiplikator vid torka

// Resurser — nära (avstånd ≤8) vs långt bort (>8)
const RESOURCE_CHANCE = 0.15;
const RESOURCES = {
  smulor:      { food: 1, protein: 0, water: 0, color: [180, 160, 120], label: "Smulor",     trips: [2, 3] },
  vatten:      { food: 0, protein: 0, water: 2, color: [100, 160, 220], label: "Vatten",     trips: [2, 3] },
  frukt:       { food: 2, protein: 1, water: 0, color: [220, 120, 60],  label: "Frukt",      trips: [2, 4] },
  insekt:      { food: 0, protein: 2, water: 0, color: [80, 120, 60],   label: "Insekt",     trips: [3, 5] },
  honungsdagg: { food: 0, protein: 0, water: 0, color: [180, 220, 80],  label: "Bladlöss!",  trips: [1, 1] },
  socker:      { food: 4, protein: 0, water: 0, color: [250, 250, 250], label: "Socker!",    trips: [4, 7] },
};
// Nära mitten: mest smulor/vatten. Långt ut: mer insekt/socker/bladlöss
const NEAR_TABLE = [
  { kind: "smulor", weight: 40 }, { kind: "vatten", weight: 20 },
  { kind: "frukt", weight: 18 }, { kind: "insekt", weight: 15 },
  { kind: "honungsdagg", weight: 4 }, { kind: "socker", weight: 3 },
];
const FAR_TABLE = [
  { kind: "smulor", weight: 20 }, { kind: "vatten", weight: 15 },
  { kind: "frukt", weight: 15 }, { kind: "insekt", weight: 22 },
  { kind: "honungsdagg", weight: 15 }, { kind: "socker", weight: 13 },
];
function totalWeight(table) { return table.reduce((s, r) => s + r.weight, 0); }

// Ägg-kostnader per myrtyp
const EGG_COST = {
  worker:  { food: 3, protein: 1 },
  soldier: { food: 3, protein: 3 },
  scout:   { food: 4, protein: 1 },
};

// Färger
const COL_FOG = [15, 10, 8];
const COL_DIRT = [101, 67, 33];
const COL_TUNNEL = [185, 155, 110];
const COL_CHAMBER = [200, 175, 130];
const COL_ROCK = [60, 55, 50];
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
    digPlan: [],
    digActive: [],
    eggs: [],
    // Resurser
    food: 8,
    protein: 4,
    water: 8,
    // Bladlöss-farmer
    aphidFarms: [],  // [{x, y, timer}]
    // Vatten
    waterTimer: WATER_USE_INTERVAL,
    dehydrated: false,
  };
}

let colony = null;

// === Resurs-val baserat på avstånd ===
function pickResource(dist) {
  const table = dist > 8 ? FAR_TABLE : NEAR_TABLE;
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
  return { kind: "smulor", ...res, tripsLeft: res.trips[0], tripsMax: res.trips[0] };
}

// === GRID ===
function initGrid(col) {
  col.grid = [];
  for (let y = 0; y < GRID_H; y++) {
    col.grid[y] = [];
    for (let x = 0; x < GRID_W; x++) {
      const tile = { type: "dirt", revealed: false, rockVariant: Math.random(), resource: null };
      col.grid[y][x] = tile;
    }
  }

  // Sten (8%, inte nära mitten)
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++) {
      if (Math.abs(x - QUEEN_X) > 4 || Math.abs(y - QUEEN_Y) > 4)
        if (Math.random() < 0.08) col.grid[y][x].type = "rock";
    }

  // Resurser (15% av dirt, inte nära mitten)
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++) {
      const t = col.grid[y][x];
      const dist = Math.abs(x - QUEEN_X) + Math.abs(y - QUEEN_Y);
      if (t.type === "dirt" && dist > 3)
        if (Math.random() < RESOURCE_CHANCE)
          t.resource = pickResource(dist);
    }

  // Kammare (3x3)
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++)
      col.grid[QUEEN_Y + dy][QUEEN_X + dx] = { type: "chamber", revealed: true, rockVariant: 0, resource: null };

  // Tunnlar ut
  for (const [ddx, ddy] of [[0, -1], [0, 1], [-1, 0], [1, 0]])
    for (let i = 2; i <= 3; i++) {
      const gx = QUEEN_X + ddx * i, gy = QUEEN_Y + ddy * i;
      if (gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H)
        col.grid[gy][gx] = { type: "tunnel", revealed: true, rockVariant: 0, resource: null };
    }

  // Avslöja runt start
  for (let y = QUEEN_Y - 4; y <= QUEEN_Y + 4; y++)
    for (let x = QUEEN_X - 4; x <= QUEEN_X + 4; x++)
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

// Tunnelregel: kan inte gräva om det skapar en 2×2 öppen yta (kammaren undantagen)
function isOpen(col, x, y) {
  if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return false;
  const t = col.grid[y][x].type;
  return t === "tunnel" || t === "chamber";
}

function wouldCreate2x2(col, gx, gy) {
  // Kolla alla 4 möjliga 2×2-block som inkluderar (gx,gy)
  // Om rutan vi gräver + de 3 andra i blocket alla är öppna → blockera
  // Undantag: om alla 4 är chamber (drottningkammaren)
  for (const [dx, dy] of [[0, 0], [-1, 0], [0, -1], [-1, -1]]) {
    const bx = gx + dx, by = gy + dy; // övre vänstra hörnet av 2×2-block
    let openCount = 0;
    let chamberCount = 0;
    for (let cy = 0; cy < 2; cy++) {
      for (let cx = 0; cx < 2; cx++) {
        const tx = bx + cx, ty = by + cy;
        if (tx < 0 || tx >= GRID_W || ty < 0 || ty >= GRID_H) continue;
        const tile = col.grid[ty][tx];
        if (tx === gx && ty === gy) { openCount++; continue; } // rutan vi vill gräva
        if (tile.type === "tunnel" || tile.type === "chamber") openCount++;
        if (tile.type === "chamber") chamberCount++;
      }
    }
    if (openCount >= 4 && chamberCount < 3) return true; // skulle skapa 2×2
  }
  return false;
}

function canDigAt(col, gx, gy) {
  if (gx < 0 || gx >= GRID_W || gy < 0 || gy >= GRID_H) return false;
  const tile = col.grid[gy][gx];
  if (tile.type !== "dirt") return false;
  if (wouldCreate2x2(col, gx, gy)) return false;
  return true;
}

function digTile(col, gx, gy) {
  col.grid[gy][gx].type = "tunnel";
  col.grid[gy][gx].revealed = true;
  col.tunnelCount++;
  revealAround(col, gx, gy);
}

// === BFS ===
function findPath(col, sx, sy, ex, ey) {
  if (sx === ex && sy === ey) return [{ x: ex, y: ey }];
  const visited = new Set();
  const queue = [{ x: sx, y: sy, path: [] }];
  visited.add(sy * GRID_W + sx);
  let steps = 0;
  while (queue.length > 0 && steps < 500) {
    const curr = queue.shift(); steps++;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = curr.x + dx, ny = curr.y + dy;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
      const key = ny * GRID_W + nx;
      if (visited.has(key)) continue;
      if (col.grid[ny][nx].type !== "tunnel" && col.grid[ny][nx].type !== "chamber") continue;
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
  if (grid[targetY][targetX].type === "tunnel" || grid[targetY][targetX].type === "chamber") return [];
  if (grid[targetY][targetX].type === "rock") return null;
  const visited = new Set();
  const queue = [];
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++)
      if (grid[y][x].type === "tunnel" || grid[y][x].type === "chamber") {
        visited.add(y * GRID_W + x);
        queue.push({ x, y, path: [] });
      }
  let steps = 0;
  while (queue.length > 0 && steps < 800) {
    const curr = queue.shift(); steps++;
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = curr.x + dx, ny = curr.y + dy;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
      const key = ny * GRID_W + nx;
      if (visited.has(key)) continue;
      if (grid[ny][nx].type === "rock") continue;
      // Skippa rutor som skulle skapa 2×2 öppen yta
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

function maxDigReach(col) { return col.antCount * DIG_REACH_PER_ANT; }

function randomTunnelTile(col) {
  const tunnels = [];
  for (let y = 0; y < GRID_H; y++)
    for (let x = 0; x < GRID_W; x++)
      if (col.grid[y][x].type === "tunnel" || col.grid[y][x].type === "chamber")
        tunnels.push({ x, y });
  return tunnels.length ? tunnels[Math.floor(Math.random() * tunnels.length)] : null;
}

// Hitta närmaste resurs på tunnel-ruta
function findNearestResource(col, sx, sy) {
  const visited = new Set();
  const queue = [{ x: sx, y: sy }];
  visited.add(sy * GRID_W + sx);
  let steps = 0;
  while (queue.length > 0 && steps < 300) {
    const curr = queue.shift(); steps++;
    const tile = col.grid[curr.y][curr.x];
    if (tile.resource && tile.resource.tripsLeft > 0 && (tile.type === "tunnel" || tile.type === "chamber"))
      return { x: curr.x, y: curr.y };
    for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
      const nx = curr.x + dx, ny = curr.y + dy;
      if (nx < 0 || nx >= GRID_W || ny < 0 || ny >= GRID_H) continue;
      const key = ny * GRID_W + nx;
      if (visited.has(key)) continue;
      if (col.grid[ny][nx].type !== "tunnel" && col.grid[ny][nx].type !== "chamber") continue;
      visited.add(key);
      queue.push({ x: nx, y: ny });
    }
  }
  return null;
}

function tileColor(col, gx, gy) {
  const tile = col.grid[gy][gx];
  if (!tile.revealed) return COL_FOG;
  switch (tile.type) {
    case "dirt": {
      const v = tile.rockVariant * 15;
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

// === SCENER ===

scene("menu", () => {
  add([text("MYRKOLONIN", { size: 48 }), pos(center()), anchor("center"),
    color(COL_QUEEN[0], COL_QUEEN[1], COL_QUEEN[2])]);
  add([text("Bygg ditt underjordiska imperium", { size: 18 }),
    pos(center().x, center().y + 45), anchor("center"), color(WHITE), opacity(0.6)]);
  add([circle(6), pos(center().x - 20, center().y - 55), anchor("center"),
    color(COL_ANT[0], COL_ANT[1], COL_ANT[2])]);
  add([circle(4), pos(center().x - 12, center().y - 60), anchor("center"),
    color(COL_ANT[0], COL_ANT[1], COL_ANT[2])]);
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

  // Kamera + zoom
  let camX = QUEEN_X * TILE + TILE / 2;
  let camY = QUEEN_Y * TILE + TILE / 2;
  let zoomLevel = ZOOM_DEFAULT;
  let isDragging = false;
  let dragStartX = 0, dragStartY = 0;
  let dragCamStartX = 0, dragCamStartY = 0;
  let dragDist = 0;
  let lastTapTime = 0, lastTapGx = -1, lastTapGy = -1;

  // Pinch
  let pinchStartDist = 0, pinchStartZoom = 1, isPinching = false, touches = {};
  const canvas = document.querySelector("canvas");
  canvas.addEventListener("touchstart", (e) => {
    for (const t of e.changedTouches) touches[t.identifier] = { x: t.clientX, y: t.clientY };
    const ids = Object.keys(touches);
    if (ids.length >= 2) {
      isPinching = true;
      const t1 = touches[ids[0]], t2 = touches[ids[1]];
      pinchStartDist = Math.hypot(t2.x - t1.x, t2.y - t1.y);
      pinchStartZoom = zoomLevel;
    }
  }, { passive: true });
  canvas.addEventListener("touchmove", (e) => {
    for (const t of e.changedTouches) if (touches[t.identifier]) touches[t.identifier] = { x: t.clientX, y: t.clientY };
    const ids = Object.keys(touches);
    if (isPinching && ids.length >= 2) {
      const t1 = touches[ids[0]], t2 = touches[ids[1]];
      zoomLevel = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinchStartZoom * Math.hypot(t2.x - t1.x, t2.y - t1.y) / pinchStartDist));
    }
  }, { passive: true });
  canvas.addEventListener("touchend", (e) => {
    for (const t of e.changedTouches) delete touches[t.identifier];
    if (Object.keys(touches).length < 2) isPinching = false;
  }, { passive: true });
  canvas.addEventListener("touchcancel", (e) => {
    for (const t of e.changedTouches) delete touches[t.identifier];
    if (Object.keys(touches).length < 2) isPinching = false;
  }, { passive: true });
  onScroll((delta) => {
    if (delta.y > 0) zoomLevel = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP);
    else if (delta.y < 0) zoomLevel = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP);
  });

  // === MYROR ===
  const antEntities = [];

  function spawnAnt(gx, gy) {
    const ant = add([
      circle(3), pos(gx * TILE + TILE / 2, gy * TILE + TILE / 2),
      anchor("center"), color(COL_ANT[0], COL_ANT[1], COL_ANT[2]), z(10), "ant",
      {
        gridX: gx, gridY: gy,
        path: null, pathIdx: 0, speed: 55,
        state: "idle",       // idle, walking, goingToDig, digging, goingToResource, collecting, returning
        digTarget: null,
        replanTimer: 0, digTimer: 0,
        carrying: null,      // resurs-objekt om myran bär
      },
    ]);
    const head = add([
      circle(2), pos(ant.pos.x + 4, ant.pos.y - 2),
      anchor("center"), color(COL_ANT[0] + 20, COL_ANT[1] + 15, COL_ANT[2] + 10), z(11),
    ]);
    antEntities.push({ ant, head });
    colony.antCount++;
    return ant;
  }

  for (const [sx, sy] of [[QUEEN_X - 1, QUEEN_Y], [QUEEN_X + 1, QUEEN_Y], [QUEEN_X, QUEEN_Y - 1]])
    spawnAnt(sx, sy);

  // Drottning
  const queen = add([
    circle(5), pos(QUEEN_X * TILE + TILE / 2, QUEEN_Y * TILE + TILE / 2),
    anchor("center"), color(COL_QUEEN[0], COL_QUEEN[1], COL_QUEEN[2]), z(15),
  ]);
  const crown = add([
    circle(2.5), pos(queen.pos.x, queen.pos.y - 7),
    anchor("center"), color(255, 210, 60), z(16),
  ]);
  let queenPulse = 0;

  // === ÄGG ===
  function layEgg() {
    // Kolla resurser
    const cost = EGG_COST.worker; // TODO: myrtyp-val i fas 3
    if (colony.food < cost.food || colony.protein < cost.protein) return;

    const spots = [];
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const ex = QUEEN_X + dx, ey = QUEEN_Y + dy;
        if (!colony.eggs.some(e => e.x === ex && e.y === ey))
          spots.push({ x: ex, y: ey });
      }
    if (spots.length === 0) return;

    colony.food -= cost.food;
    colony.protein -= cost.protein;

    const spot = spots[Math.floor(Math.random() * spots.length)];
    const eggEntity = add([
      circle(2.5), pos(spot.x * TILE + TILE / 2, spot.y * TILE + TILE / 2),
      anchor("center"), color(COL_EGG[0], COL_EGG[1], COL_EGG[2]), z(12), opacity(0.9),
    ]);
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
        } else {
          egg.entity.radius = 1.5 + (egg.age / EGG_MIN_HATCH);
        }
      }
      if (egg.age >= EGG_AUTO_HATCH) hatchEgg(egg);
    }
  }

  // === TOAST ===
  let toastText = "", toastTimer = 0;
  function showToast(msg) { toastText = msg; toastTimer = 2.5; }

  // === GRÄVPLAN ===
  function totalPlannedDigs() { return colony.digPlan.length + colony.digActive.length; }

  function addDigPlan(targetX, targetY) {
    const path = findDigPath(colony, targetX, targetY);
    if (!path || path.length === 0) return;
    const reach = maxDigReach(colony);
    const slotsLeft = reach - totalPlannedDigs();
    if (slotsLeft <= 0) { showToast(`Max ${reach} grävplatser (${colony.antCount} myror)`); return; }
    const newTiles = path.filter(p =>
      !colony.digPlan.some(d => d.x === p.x && d.y === p.y) &&
      !colony.digActive.some(d => d.x === p.x && d.y === p.y));
    if (newTiles.length === 0) return;
    const toAdd = newTiles.slice(0, slotsLeft);
    if (toAdd.length < newTiles.length) showToast(`${toAdd.length} av ${newTiles.length} rutor planerade`);
    for (const p of toAdd) colony.digPlan.push({ x: p.x, y: p.y });
  }

  function assignDiggers() {
    if (colony.digPlan.length === 0) return;
    const idleAnts = antEntities.filter(e => e.ant.state === "idle" || e.ant.state === "walking");
    for (const entry of idleAnts) {
      if (colony.digPlan.length === 0) break;
      let planIdx = -1;
      for (let i = 0; i < colony.digPlan.length; i++) {
        const p = colony.digPlan[i];
        for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
          const nx = p.x + dx, ny = p.y + dy;
          if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H &&
              (colony.grid[ny][nx].type === "tunnel" || colony.grid[ny][nx].type === "chamber")) {
            planIdx = i; break;
          }
        }
        if (planIdx >= 0) break;
      }
      if (planIdx === -1) break;
      const target = colony.digPlan.splice(planIdx, 1)[0];
      const ant = entry.ant;
      let bestPath = null;
      for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
        const nx = target.x + dx, ny = target.y + dy;
        if (nx >= 0 && nx < GRID_W && ny >= 0 && ny < GRID_H &&
            (colony.grid[ny][nx].type === "tunnel" || colony.grid[ny][nx].type === "chamber")) {
          const p = findPath(colony, ant.gridX, ant.gridY, nx, ny);
          if (p && (!bestPath || p.length < bestPath.length)) bestPath = p;
        }
      }
      if (bestPath) {
        ant.path = bestPath; ant.pathIdx = 0;
        ant.state = "goingToDig"; ant.digTarget = { x: target.x, y: target.y }; ant.digTimer = 0;
        colony.digActive.push({ x: target.x, y: target.y });
      } else colony.digPlan.unshift(target);
    }
  }

  // === MYRLOGIK ===
  function antSpeed(ant) {
    return ant.speed * (colony.dehydrated ? DEHYDRATION_SPEED : 1);
  }

  function updateAnts(elapsed) {
    assignDiggers();
    for (const entry of antEntities) {
      const ant = entry.ant;
      ant.replanTimer -= elapsed;

      // IDLE — leta resurs eller vandra
      if (ant.state === "idle" && ant.replanTimer <= 0) {
        // Prioritet 1: hämta resurs
        if (!ant.carrying) {
          const res = findNearestResource(colony, ant.gridX, ant.gridY);
          if (res) {
            const path = findPath(colony, ant.gridX, ant.gridY, res.x, res.y);
            if (path) {
              ant.path = path; ant.pathIdx = 0; ant.state = "goingToResource";
              ant.replanTimer = 5; // kolla igen om 5 sek
              continue;
            }
          }
        }
        // Prioritet 2: vandra
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

      // GOING TO DIG
      if (ant.state === "goingToDig") {
        if (ant.path && ant.pathIdx < ant.path.length) moveAnt(ant, elapsed);
        else { ant.state = "digging"; ant.digTimer = 1.2; }
      }

      // DIGGING
      if (ant.state === "digging") {
        ant.digTimer -= elapsed;
        if (ant.digTimer <= 0 && ant.digTarget) {
          const tgt = ant.digTarget;
          if (colony.grid[tgt.y][tgt.x].type === "dirt" && canDigAt(colony, tgt.x, tgt.y)) {
            digTile(colony, tgt.x, tgt.y);
            // Partiklar
            for (let i = 0; i < 6; i++)
              add([circle(rand(1, 3)), pos(tgt.x * TILE + TILE / 2 + rand(-10, 10), tgt.y * TILE + TILE / 2 + rand(-10, 10)),
                color(COL_DIRT[0] + rand(0, 30), COL_DIRT[1] + rand(0, 20), COL_DIRT[2]),
                opacity(1), z(20), lifespan(0.5, { fade: 0.3 }), move(rand(0, 360), rand(20, 60))]);
            // Resurs avslöjad?
            const tile = colony.grid[tgt.y][tgt.x];
            if (tile.resource) showToast(tile.resource.label);
          }
          colony.digActive = colony.digActive.filter(d => d.x !== tgt.x || d.y !== tgt.y);
          ant.digTarget = null; ant.state = "idle"; ant.path = null; ant.replanTimer = 0.3;
        }
      }

      // GOING TO RESOURCE
      if (ant.state === "goingToResource") {
        if (ant.path && ant.pathIdx < ant.path.length) {
          moveAnt(ant, elapsed);
        } else {
          // Framme — ta en last
          const tile = colony.grid[ant.gridY][ant.gridX];
          if (tile.resource && tile.resource.tripsLeft > 0) {
            const res = tile.resource;
            // Kopiera en last (inte referens till resursen)
            ant.carrying = { kind: res.kind, food: res.food, protein: res.protein, water: res.water, color: res.color, label: res.label };
            ant.resourceSource = { x: ant.gridX, y: ant.gridY }; // minns var den hämtade
            res.tripsLeft--;
            if (res.tripsLeft <= 0) tile.resource = null; // uttömd
            ant.state = "returning";
            const path = findPath(colony, ant.gridX, ant.gridY, QUEEN_X, QUEEN_Y);
            if (path) { ant.path = path; ant.pathIdx = 0; }
            else { ant.state = "idle"; ant.carrying = null; ant.replanTimer = 1; }
          } else {
            ant.state = "idle"; ant.path = null; ant.replanTimer = 0.5;
          }
        }
      }

      // RETURNING med resurs
      if (ant.state === "returning") {
        if (ant.path && ant.pathIdx < ant.path.length) {
          moveAnt(ant, elapsed);
        } else {
          // Leverera!
          if (ant.carrying) {
            const res = ant.carrying;
            if (res.kind === "honungsdagg") {
              // Bladlöss → skapa farm vid kammaren
              const farmSpot = { x: ant.gridX, y: ant.gridY };
              if (!colony.aphidFarms.some(f => f.x === farmSpot.x && f.y === farmSpot.y)) {
                colony.aphidFarms.push({ x: farmSpot.x, y: farmSpot.y, timer: 0 });
                showToast("Bladlöss-farm skapad!");
              }
            } else {
              colony.food += res.food;
              colony.protein += res.protein;
              colony.water += res.water;
            }
            // Visuell popup
            add([text(`+${res.label}`, { size: 10 }), pos(ant.pos.x, ant.pos.y - 10),
              anchor("center"), color(res.color[0], res.color[1], res.color[2]),
              z(25), opacity(1), lifespan(1, { fade: 0.5 }), move(UP, 20)]);
            ant.carrying = null;
          }
          ant.state = "idle"; ant.path = null; ant.replanTimer = 0.3;
        }
      }

      // Visuellt: ändra färg om bär
      if (ant.carrying) {
        entry.ant.color = rgb(COL_ANT_CARRY[0], COL_ANT_CARRY[1], COL_ANT_CARRY[2]);
      } else {
        entry.ant.color = rgb(COL_ANT[0], COL_ANT[1], COL_ANT[2]);
      }

      // Huvud
      if (entry.head) {
        entry.head.pos.x = ant.pos.x + 4;
        entry.head.pos.y = ant.pos.y - 2;
      }
    }
  }

  function moveAnt(ant, elapsed) {
    const target = ant.path[ant.pathIdx];
    const tx = target.x * TILE + TILE / 2, ty = target.y * TILE + TILE / 2;
    const dx = tx - ant.pos.x, dy = ty - ant.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) { ant.gridX = target.x; ant.gridY = target.y; ant.pathIdx++; }
    else {
      const spd = antSpeed(ant) * elapsed;
      ant.pos.x += (dx / dist) * spd;
      ant.pos.y += (dy / dist) * spd;
    }
  }

  // === BLADLÖSS ===
  function updateAphids(elapsed) {
    for (const farm of colony.aphidFarms) {
      farm.timer += elapsed;
      if (farm.timer >= 10) {
        farm.timer -= 10;
        colony.food += 1;
        // Visuell
        add([text("+1", { size: 10 }), pos(farm.x * TILE + TILE / 2, farm.y * TILE + TILE / 2 - 8),
          anchor("center"), color(180, 220, 80), z(25), opacity(1), lifespan(1, { fade: 0.5 }), move(UP, 15)]);
      }
    }
  }

  // === VATTEN ===
  function updateWater(elapsed) {
    colony.waterTimer -= elapsed;
    if (colony.waterTimer <= 0) {
      colony.waterTimer = WATER_USE_INTERVAL;
      if (colony.water > 0) {
        colony.water--;
      } else {
        colony.dehydrated = true;
      }
    }
    // Återhämta om vatten finns
    if (colony.water > 0) colony.dehydrated = false;
  }

  // === DROTTNING ===
  colony.queenTimer = colony.queenInterval;

  function updateQueen(elapsed) {
    colony.queenTimer -= elapsed;
    queenPulse += elapsed * 2;
    queen.radius = 5 + Math.sin(queenPulse) * 0.8;
    crown.pos.y = queen.pos.y - 7 + Math.sin(queenPulse) * 0.8;
    if (colony.queenTimer <= 0) {
      colony.queenTimer = colony.queenInterval;
      layEgg();
    }
  }

  // === KAMERA ===
  function clampCam() {
    const hw = (width() / 2) / zoomLevel, hh = (height() / 2) / zoomLevel;
    camX = Math.max(hw, Math.min(WORLD_W - hw, camX));
    camY = Math.max(hh, Math.min(WORLD_H - hh, camY));
  }
  function screenToWorld(sx, sy) {
    return { x: (sx - width() / 2) / zoomLevel + camX, y: (sy - height() / 2) / zoomLevel + camY };
  }

  onMousePress(() => {
    if (isPinching) return;
    isDragging = true; dragStartX = mousePos().x; dragStartY = mousePos().y;
    dragCamStartX = camX; dragCamStartY = camY; dragDist = 0;
  });
  onMouseMove(() => {
    if (!isDragging || isPinching) return;
    const dx = mousePos().x - dragStartX, dy = mousePos().y - dragStartY;
    dragDist = Math.hypot(dx, dy);
    camX = dragCamStartX - dx / zoomLevel; camY = dragCamStartY - dy / zoomLevel; clampCam();
  });
  onMouseRelease(() => {
    if (isPinching) { isDragging = false; return; }
    if (dragDist < 8) {
      const now = time();
      const world = screenToWorld(mousePos().x, mousePos().y);
      const gx = Math.floor(world.x / TILE), gy = Math.floor(world.y / TILE);
      if (gx >= 0 && gx < GRID_W && gy >= 0 && gy < GRID_H) {
        const egg = colony.eggs.find(e => e.x === gx && e.y === gy && e.age >= EGG_MIN_HATCH);
        if (egg) { hatchEgg(egg); }
        else {
          const tile = colony.grid[gy][gx];
          if (tile.type === "dirt" || !tile.revealed) {
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
  // Rad 1: koloni
  const hudScore = add([text("Koloni: 0", { size: fs }), pos(10, hy), fixed(), color(255, 220, 100), z(101)]);
  const hudAnts = add([text("Myror: 3", { size: fs }), pos(w * 0.35, hy), fixed(), color(WHITE), z(101)]);
  const hudTime = add([text("0:00", { size: fs }), pos(w * 0.7, hy), fixed(), color(WHITE), opacity(0.7), z(101)]);
  // Rad 2: resurser
  const hudSugar = add([text("Socker: 8", { size: fs }), pos(10, hy + 20), fixed(), color(220, 180, 100), z(101)]);
  const hudProtein = add([text("Protein: 4", { size: fs }), pos(w * 0.35, hy + 20), fixed(), color(80, 160, 80), z(101)]);
  const hudWater = add([text("Vatten: 8", { size: fs }), pos(w * 0.7, hy + 20), fixed(), color(100, 160, 220), z(101)]);
  // Rad 3: ägg
  const hudEggs = add([text("", { size: fs }), pos(10, hy + 40), fixed(), color(COL_EGG_READY[0], COL_EGG_READY[1], COL_EGG_READY[2]), z(101)]);

  // Zoom-knappar
  const zoomInBtn = add([rect(36, 36, { radius: 4 }), pos(w - 46, height() - 90), fixed(), color(80, 60, 40), opacity(0.7), z(101), area()]);
  add([text("+", { size: 22 }), pos(w - 28, height() - 72), fixed(), anchor("center"), color(WHITE), z(102)]);
  zoomInBtn.onClick(() => { zoomLevel = Math.min(ZOOM_MAX, zoomLevel + ZOOM_STEP); });
  const zoomOutBtn = add([rect(36, 36, { radius: 4 }), pos(w - 46, height() - 48), fixed(), color(80, 60, 40), opacity(0.7), z(101), area()]);
  add([text("−", { size: 22 }), pos(w - 28, height() - 30), fixed(), anchor("center"), color(WHITE), z(102)]);
  zoomOutBtn.onClick(() => { zoomLevel = Math.max(ZOOM_MIN, zoomLevel - ZOOM_STEP); });

  // Hem
  const homeBtn = add([rect(50, 28, { radius: 4 }), pos(w - 60, 4), fixed(), color(80, 60, 40), opacity(0.7), z(101), area()]);
  add([text("Hem", { size: 14 }), pos(w - 35, 10), fixed(), anchor("center"), color(WHITE), z(102)]);
  homeBtn.onClick(() => { camX = QUEEN_X * TILE + TILE / 2; camY = QUEEN_Y * TILE + TILE / 2; zoomLevel = ZOOM_DEFAULT; });

  // Toast
  const toastLabel = add([text("", { size: 14 }), pos(center().x, height() - 40), fixed(), anchor("center"), color(255, 200, 80), opacity(0), z(103)]);

  let hoverGx = -1, hoverGy = -1;

  // === MAIN LOOP ===
  onUpdate(() => {
    const elapsed = dt();
    camPos(camX, camY);
    camScale(zoomLevel);

    updateAnts(elapsed);
    updateQueen(elapsed);
    updateEggs(elapsed);
    updateAphids(elapsed);
    updateWater(elapsed);

    // HUD
    const score = colony.antCount * 10 + colony.tunnelCount * 2;
    hudScore.text = `Koloni: ${score}`;
    hudAnts.text = `Myror: ${colony.antCount}`;
    const readyEggs = colony.eggs.filter(e => e.age >= EGG_MIN_HATCH).length;
    hudEggs.text = colony.eggs.length > 0 ? `Ägg: ${readyEggs}/${colony.eggs.length} (tryck för att kläcka)` : "";
    const sec = Math.floor(time() - colony.startTime);
    hudTime.text = `${Math.floor(sec / 60)}:${(sec % 60).toString().padStart(2, "0")}`;
    hudSugar.text = `Socker: ${colony.food}`;
    hudProtein.text = `Protein: ${colony.protein}`;
    hudWater.text = `Vatten: ${colony.water}`;
    if (colony.dehydrated) hudWater.color = rgb(255, 80, 80);
    else hudWater.color = rgb(100, 160, 220);

    // Toast
    if (toastTimer > 0) {
      toastTimer -= elapsed;
      toastLabel.text = toastText;
      toastLabel.opacity = Math.min(1, toastTimer * 2);
    } else toastLabel.opacity = 0;

    // Hover
    if (!isDragging) {
      const world = screenToWorld(mousePos().x, mousePos().y);
      hoverGx = Math.floor(world.x / TILE); hoverGy = Math.floor(world.y / TILE);
    }
  });

  // === RITA GRID ===
  onDraw(() => {
    const hw = (width() / 2) / zoomLevel, hh = (height() / 2) / zoomLevel;
    const startX = Math.max(0, Math.floor((camX - hw) / TILE));
    const startY = Math.max(0, Math.floor((camY - hh) / TILE));
    const endX = Math.min(GRID_W - 1, Math.ceil((camX + hw) / TILE));
    const endY = Math.min(GRID_H - 1, Math.ceil((camY + hh) / TILE));

    const planSet = new Set();
    for (const p of colony.digPlan) planSet.add(p.y * GRID_W + p.x);
    for (const p of colony.digActive) planSet.add(p.y * GRID_W + p.x);

    // Bladlöss-set
    const aphidSet = new Set();
    for (const f of colony.aphidFarms) aphidSet.add(f.y * GRID_W + f.x);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        const tc = tileColor(colony, x, y);
        const px = x * TILE, py = y * TILE;

        drawRect({ pos: vec2(px, py), width: TILE, height: TILE, color: rgb(tc[0], tc[1], tc[2]) });

        const tile = colony.grid[y][x];
        if (tile.revealed && tile.type !== "dirt") {
          drawRect({ pos: vec2(px, py), width: TILE, height: TILE,
            outline: { width: 0.5, color: rgb(0, 0, 0) }, fill: false, opacity: 0.15 });
        }

        if (tile.type === "chamber") {
          drawRect({ pos: vec2(px + 1, py + 1), width: TILE - 2, height: TILE - 2,
            outline: { width: 1, color: rgb(200, 170, 60) }, fill: false, opacity: 0.3 });
        }

        // Resurs-ikon (storlek = trips kvar)
        if (tile.resource && tile.resource.tripsLeft > 0 && tile.revealed && (tile.type === "tunnel" || tile.type === "chamber")) {
          const rc = tile.resource.color;
          const sizeFactor = tile.resource.tripsLeft / tile.resource.tripsMax;
          const rad = 2 + sizeFactor * 4; // 2-6px radie beroende på kvar
          drawCircle({ pos: vec2(px + TILE / 2, py + TILE / 2), radius: rad,
            color: rgb(rc[0], rc[1], rc[2]), opacity: 0.9 });
        }

        // Bladlöss-farm
        if (aphidSet.has(y * GRID_W + x)) {
          const pulse = Math.sin(time() * 3 + x + y) * 0.15 + 0.85;
          drawCircle({ pos: vec2(px + TILE / 2, py + TILE / 2), radius: 5,
            color: rgb(180, 220, 80), opacity: pulse * 0.5 });
          drawCircle({ pos: vec2(px + TILE / 2, py + TILE / 2), radius: 2,
            color: rgb(120, 180, 40), opacity: pulse });
        }

        // Grävplan
        if (planSet.has(y * GRID_W + x)) {
          drawRect({ pos: vec2(px + 2, py + 2), width: TILE - 4, height: TILE - 4,
            outline: { width: 2, color: rgb(COL_PLAN[0], COL_PLAN[1], COL_PLAN[2]) }, fill: false, opacity: 0.7 });
        }

        // Första-tap
        if (x === lastTapGx && y === lastTapGy && (time() - lastTapTime) < DOUBLE_TAP_MS / 1000) {
          drawRect({ pos: vec2(px + 1, py + 1), width: TILE - 2, height: TILE - 2,
            outline: { width: 2, color: rgb(255, 255, 255) }, fill: false, opacity: 0.6 });
        }
      }
    }
  });
});

go("menu");
