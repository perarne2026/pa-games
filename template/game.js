// === GAME TEMPLATE ===
// Kaplay.js - enkel, kul, funkar på alla enheter
// Ändra denna fil för att skapa ditt spel!

kaplay({
  background: [135, 206, 235], // himmelsblå
  width: 800,
  height: 600,
  stretch: true,
  letterbox: true,
  touchToMouse: true, // touch funkar som mus automatiskt
});

// --- LADDNING ---
// Enkla former behöver inga assets!
// Men du kan ladda bilder/ljud så här:
// loadSprite("player", "sprites/player.png");
// loadSound("jump", "sounds/jump.wav");

// --- SCENER ---

scene("menu", () => {
  add([
    text("MITT SPEL", { size: 48 }),
    pos(center()),
    anchor("center"),
    color(WHITE),
  ]);

  add([
    text("Klicka för att starta", { size: 24 }),
    pos(center().x, center().y + 60),
    anchor("center"),
    color(WHITE),
    opacity(0.7),
  ]);

  onClick(() => go("game"));
  onKeyPress("space", () => go("game"));
});

scene("game", () => {
  // Gravity
  setGravity(1600);

  // Poäng
  let score = 0;
  const scoreLabel = add([
    text("0", { size: 32 }),
    pos(24, 24),
    fixed(),
    z(100),
  ]);

  // Mark
  add([
    rect(width(), 48),
    pos(0, height() - 48),
    outline(2),
    area(),
    body({ isStatic: true }),
    color(34, 139, 34),
  ]);

  // Spelare
  const player = add([
    rect(32, 32),
    pos(80, height() - 100),
    area(),
    body(),
    color(255, 220, 0),
    "player",
  ]);

  // Hopp
  function jump() {
    if (player.isGrounded()) {
      player.jump(600);
    }
  }

  onKeyPress("space", jump);
  onKeyPress("up", jump);
  onClick(jump);

  // Hinder som kommer
  function spawnObstacle() {
    const h = rand(32, 96);
    add([
      rect(24, h),
      pos(width(), height() - 48 - h),
      area(),
      move(LEFT, 300 + score * 2),
      offscreen({ destroy: true }),
      color(200, 50, 50),
      "obstacle",
    ]);

    wait(rand(0.8, 2.0), spawnObstacle);
  }
  spawnObstacle();

  // Poäng ökar
  const timer = loop(0.5, () => {
    score++;
    scoreLabel.text = score.toString();
  });

  // Kollision = game over
  player.onCollide("obstacle", () => {
    // Spara highscore
    const best = Number(localStorage.getItem("highscore") || 0);
    if (score > best) localStorage.setItem("highscore", score.toString());
    go("gameover", score);
  });
});

scene("gameover", (finalScore) => {
  const best = Number(localStorage.getItem("highscore") || 0);

  add([
    text("Game Over!", { size: 48 }),
    pos(center().x, center().y - 40),
    anchor("center"),
    color(WHITE),
  ]);

  add([
    text(`Poäng: ${finalScore}`, { size: 32 }),
    pos(center().x, center().y + 20),
    anchor("center"),
    color(WHITE),
  ]);

  add([
    text(`Bäst: ${best}`, { size: 24 }),
    pos(center().x, center().y + 60),
    anchor("center"),
    color(255, 220, 0),
  ]);

  add([
    text("Klicka för att spela igen", { size: 20 }),
    pos(center().x, center().y + 110),
    anchor("center"),
    color(WHITE),
    opacity(0.7),
  ]);

  onClick(() => go("game"));
  onKeyPress("space", () => go("game"));
});

// Starta!
go("menu");
