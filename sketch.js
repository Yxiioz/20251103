/*
  Quiz with generated CSV, random 4-question quiz, interactive buttons and results feedback.
  - 全螢幕、背景動畫、選項動畫、即時答題回饋、結果煙火
*/

const CANVAS_W = window.innerWidth;
const CANVAS_H = window.innerHeight;
const NUM_QUESTIONS = 4;
const FONT_SIZE = 20;
let OPTION_WIDTH = CANVAS_W * 0.6;
const OPTION_HEIGHT = 52;

const COLORS = {
  background: '#FFE5E5',
  text: '#FF1E1E',
  option: '#FFB3B3',
  optionHover: '#FF8080',
  button: '#FF4D4D',
  buttonHover: '#FF0000'
};

// 互動與題庫
let table;
let allQuestions = [];
let quizQuestions = [];
let currentQuestionIndex = 0;
let score = 0;
let quizState = 'IDLE'; // IDLE, QUIZ, RESULT

// 動畫 / 粒子 / 煙火
let bgParticles = [];
let feedbackParticles = [];
let fireworks = [];
let gravity;

// 即時回饋
let feedbackText = '';
let feedbackType = ''; // 'correct' or 'wrong'
let feedbackTimer = 0; // frames remaining to show feedback
let feedbackPos = { x: 0, y: 0 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  textFont('Arial');
  textSize(FONT_SIZE);
  textAlign(CENTER, CENTER);

  gravity = createVector(0, 0.2);
  initBackgroundParticles();

  generateTable();
  loadQuestionsFromTable();
  resetQuiz();
  quizState = 'IDLE';
  noCursor();
}

function draw() {
  background(COLORS.background);
  updateBackgroundParticles();
  drawTopUI();

  if (quizState === 'IDLE') {
    drawIdle();
  } else if (quizState === 'QUIZ') {
    displayQuiz();
  } else if (quizState === 'RESULT') {
    displayResult();
  }

  updateFeedbackParticles();
  updateFireworks();

  // 渲染互動滑鼠（小圈）
  drawCursor();
}

function drawTopUI() {
  // 顯示分數（右上）
  push();
  textSize(18);
  fill(COLORS.text);
  noStroke();
  rectMode(CORNER);
  let sx = width - 170, sy = 20;
  fill('#fff1f1');
  stroke(COLORS.text);
  strokeWeight(1);
  rect(sx, sy, 150, 36, 8);
  noStroke();
  fill(COLORS.text);
  textAlign(CENTER, CENTER);
  text(`得分 ${score}/${NUM_QUESTIONS}`, sx + 75, sy + 18);
  pop();
}

function drawIdle() {
  push();
  fill(COLORS.text);
  textSize(36);
  text('按任意處開始測驗（p5.js 題庫）', width / 2, height / 2 - 40);
  textSize(18);
  text('每次隨機抽 4 題，答題後會有即時回饋與結果煙火', width / 2, height / 2 + 10);
  pop();
}

function displayQuiz() {
  let q = quizQuestions[currentQuestionIndex];
  if (!q) return;

  // 標題與題目（置中）
  push();
  translate(0, sin(frameCount * 0.05) * 6);
  fill(COLORS.text);
  textSize(28);
  text(`第 ${currentQuestionIndex + 1} 題 / 共 ${NUM_QUESTIONS}`, width / 2, 80);
  textSize(26);
  text(q.question, width / 2, 150);
  pop();

  // 選項列表（置中）
  let keys = ['A', 'B', 'C', 'D'];
  OPTION_WIDTH = min(width * 0.8, 800);
  for (let i = 0; i < keys.length; i++) {
    drawAnimatedOption(q, keys[i], i);
  }

  // 顯示即時回饋（若有）
  if (feedbackTimer > 0) {
    push();
    textSize(28);
    if (feedbackType === 'correct') fill('#1fbf4a'); else fill('#d32f2f');
    text(feedbackText, feedbackPos.x, feedbackPos.y - 60);
    pop();
  }
}

function drawAnimatedOption(q, key, index) {
  let y = 240 + index * (OPTION_HEIGHT + 18);
  let x = width / 2 - OPTION_WIDTH / 2;
  let hover = (mouseX > x && mouseX < x + OPTION_WIDTH &&
               mouseY > y && mouseY < y + OPTION_HEIGHT);
  let offsetX = hover ? sin(frameCount * 0.12) * 6 : 0;

  push();
  translate(offsetX, 0);
  rectMode(CORNER);
  noStroke();
  fill(hover ? COLORS.optionHover : COLORS.option);
  stroke(COLORS.text);
  strokeWeight(1);
  rect(x, y, OPTION_WIDTH, OPTION_HEIGHT, 12);

  noStroke();
  fill(COLORS.text);
  textAlign(LEFT, CENTER);
  textSize(20);
  text(`${key}. ${q.options[key]}`, x + 24, y + OPTION_HEIGHT / 2);
  pop();
}

function mousePressed() {
  // 若正在顯示即時回饋，忽略點擊
  if (feedbackTimer > 0) return;

  if (quizState === 'IDLE') {
    quizState = 'QUIZ';
    return;
  }

  if (quizState === 'QUIZ') {
    // 檢查是否點在選項上
    let x = width / 2 - OPTION_WIDTH / 2;
    for (let i = 0; i < 4; i++) {
      let y = 240 + i * (OPTION_HEIGHT + 18);
      if (mouseX > x && mouseX < x + OPTION_WIDTH &&
          mouseY > y && mouseY < y + OPTION_HEIGHT) {
        // 使用者選取選項 i
        let selected = ['A', 'B', 'C', 'D'][i];
        checkAnswer(selected, x + OPTION_WIDTH / 2, y + OPTION_HEIGHT / 2);
        break;
      }
    }
  }

  // 再測一次或從結果回到 IDLE
  if (quizState === 'RESULT') {
    // 點擊畫面任何處重設
    resetQuiz();
    quizState = 'QUIZ';
  }
}

function checkAnswer(selected, px, py) {
  let q = quizQuestions[currentQuestionIndex];
  if (!q) return;

  if (selected === q.correct) {
    score++;
    feedbackText = '答對！';
    feedbackType = 'correct';
    spawnFeedbackParticles(px, py, true);
  } else {
    feedbackText = '答錯';
    feedbackType = 'wrong';
    spawnFeedbackParticles(px, py, false);
  }

  feedbackPos.x = px;
  feedbackPos.y = py;
  feedbackTimer = 45; // 顯示約0.75秒（60fps為準）

  // 暫時禁止再點擊，等 feedbackTimer 結束再前進
  // 使用 draw() 的每幀遞減
  // 在 feedback 結束時自動前往下一題或結果
}

// 每幀更新即時回饋倒數與行為
function updateFeedbackParticles() {
  // 更新與顯示小粒子
  for (let i = feedbackParticles.length - 1; i >= 0; i--) {
    let p = feedbackParticles[i];
    p.applyForce(gravity.copy().mult(0.2));
    p.update();
    p.show();
    if (p.done()) feedbackParticles.splice(i, 1);
  }

  if (feedbackTimer > 0) {
    feedbackTimer--;
    if (feedbackTimer === 0) {
      // 移至下一題或結果
      currentQuestionIndex++;
      if (currentQuestionIndex >= NUM_QUESTIONS) {
        quizState = 'RESULT';
      }
      // 清掉 feedback 顯示文字
      feedbackText = '';
      feedbackType = '';
      // small delay before fireworks allowed (fireworks managed in updateFireworks)
    }
  }
}

// 簡單背景粒子
function initBackgroundParticles() {
  bgParticles = [];
  for (let i = 0; i < 60; i++) {
    bgParticles.push({
      x: random(width),
      y: random(height),
      size: random(2, 8),
      vx: random(-0.5, 0.5),
      vy: random(-0.5, 0.5),
      c: color(255, random(120, 220), random(120, 220), 70)
    });
  }
}

function updateBackgroundParticles() {
  for (let p of bgParticles) {
    p.x += p.vx;
    p.y += p.vy;
    if (p.x < -10) p.x = width + 10;
    if (p.x > width + 10) p.x = -10;
    if (p.y < -10) p.y = height + 10;
    if (p.y > height + 10) p.y = -10;
    noStroke();
    fill(p.c);
    circle(p.x, p.y, p.size);
  }
}

// 小型回饋粒子群
function spawnFeedbackParticles(x, y, isCorrect) {
  let count = isCorrect ? 18 : 12;
  for (let i = 0; i < count; i++) {
    let hu = isCorrect ? color(60, 180, 80) : color(220, 50, 50);
    feedbackParticles.push(new MiniParticle(x + random(-10, 10), y + random(-10, 10), hu));
  }
}

// MiniParticle 類別（回饋用）
class MiniParticle {
  constructor(x, y, col) {
    this.pos = createVector(x, y);
    this.vel = p5.Vector.random2D().mult(random(1, 5));
    this.acc = createVector(0, 0);
    this.lifespan = 255;
    this.col = col;
    this.r = random(2, 5);
  }
  applyForce(f) { this.acc.add(f); }
  update() {
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);
    this.lifespan -= 6;
  }
  done() { return this.lifespan <= 0; }
  show() {
    noStroke();
    push();
    fill(red(this.col), green(this.col), blue(this.col), this.lifespan);
    circle(this.pos.x, this.pos.y, this.r);
    pop();
  }
}

// Firework 系統（結果頁面用）
function updateFireworks() {
  if (quizState !== 'RESULT') return;
  if (score >= 2) {
    if (random(1) < 0.04) {
      fireworks.push(new Firework());
    }
  }
  for (let i = fireworks.length - 1; i >= 0; i--) {
    fireworks[i].update();
    fireworks[i].show();
    if (fireworks[i].done()) fireworks.splice(i, 1);
  }
}

// Firework 與 Particle（稍大型）
class Particle {
  constructor(x, y, isFirework, hu) {
    this.pos = createVector(x, y);
    this.isFirework = isFirework;
    this.lifespan = 255;
    this.hu = hu === undefined ? random(0, 255) : hu;
    if (isFirework) {
      this.vel = createVector(random(-2, 2), random(-12, -6));
    } else {
      this.vel = p5.Vector.random2D().mult(random(2, 8));
    }
    this.acc = createVector(0, 0);
    this.r = isFirework ? 4 : random(2, 4);
  }
  applyForce(f) { this.acc.add(f); }
  update() {
    if (!this.isFirework) {
      this.vel.mult(0.98);
      this.lifespan -= 3;
    }
    this.vel.add(this.acc);
    this.pos.add(this.vel);
    this.acc.mult(0);
  }
  done() { return this.lifespan <= 0; }
  show() {
    colorMode(RGB);
    if (this.isFirework) {
      strokeWeight(3);
      stroke(this.hu, 200, 150);
      point(this.pos.x, this.pos.y);
    } else {
      noStroke();
      fill(this.hu, 150, 200, this.lifespan);
      circle(this.pos.x, this.pos.y, this.r);
    }
  }
}

class Firework {
  constructor() {
    this.hu = color(random(60, 255), random(60, 255), random(60, 255));
    this.firework = new Particle(random(50, width - 50), height, true, this.hu);
    this.exploded = false;
    this.particles = [];
  }
  done() {
    return this.exploded && this.particles.length === 0;
  }
  update() {
    if (!this.exploded) {
      this.firework.applyForce(gravity);
      this.firework.update();
      if (this.firework.vel.y >= 0) {
        this.exploded = true;
        this.explode();
      }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      this.particles[i].applyForce(gravity);
      this.particles[i].update();
      if (this.particles[i].done()) this.particles.splice(i, 1);
    }
  }
  explode() {
    for (let i = 0; i < 80; i++) {
      this.particles.push(new Particle(this.firework.pos.x, this.firework.pos.y, false, this.hu));
    }
  }
  show() {
    if (!this.exploded) this.firework.show();
    for (let p of this.particles) p.show();
  }
}

// 顯示結果頁面
function displayResult() {
  push();
  fill(COLORS.text);
  textAlign(CENTER, CENTER);
  textSize(36);
  text('測驗完成！', width / 2, 140);
  textSize(28);
  text(`得分：${score} / ${NUM_QUESTIONS}`, width / 2, 200);

  let percent = (score / NUM_QUESTIONS) * 100;
  let fb = '';
  if (percent >= 80) fb = '太棒了！完美表現！';
  else if (percent >= 50) fb = '不錯，繼續努力！';
  else fb = '需要多練習喔！';
  textSize(22);
  fill('#8b0000');
  text(fb, width / 2, 260);

  textSize(18);
  fill(COLORS.text);
  text('按任意處再次測驗（或重新載入）', width / 2, height - 80);
  pop();
}

// 題庫建立與題目抽取
function generateTable() {
  table = new p5.Table();
  table.addColumn('Question');
  table.addColumn('OptionA');
  table.addColumn('OptionB');
  table.addColumn('OptionC');
  table.addColumn('OptionD');
  table.addColumn('CorrectAnswer');

  addRow(table, "在 p5.js 中，哪個函式用於初始設定？", "draw()", "setup()", "preload()", "display()", "B");
  addRow(table, "使用哪個函式可以繪製矩形？", "rect()", "circle()", "square()", "box()", "A");
  addRow(table, "哪個函式用於持續執行動畫？", "loop()", "animate()", "draw()", "update()", "C");
  addRow(table, "設定畫布背景顏色的函式是？", "color()", "fill()", "stroke()", "background()", "D");
  addRow(table, "在 p5.js 中偵測滑鼠點擊的函式是？", "mousePressed()", "mouseClick()", "onClick()", "clickEvent()", "A");
  addRow(table, "繪製圓形的函式是？", "circle()", "round()", "ellipse()", "arc()", "A");
  addRow(table, "取得畫布寬度的變數是？", "canvasWidth", "width", "w", "screenWidth", "B");
  addRow(table, "設定填充顏色的函式是？", "setColor()", "color()", "fill()", "paint()", "C");
  addRow(table, "設定線條粗細的函式是？", "lineWidth()", "strokeWeight()", "penSize()", "thickness()", "B");
}

function addRow(tbl, q, a, b, c, d, correct) {
  let r = tbl.addRow();
  r.setString('Question', q);
  r.setString('OptionA', a);
  r.setString('OptionB', b);
  r.setString('OptionC', c);
  r.setString('OptionD', d);
  r.setString('CorrectAnswer', correct);
}

function loadQuestionsFromTable() {
  allQuestions = [];
  for (let i = 0; i < table.getRowCount(); i++) {
    let row = table.getRow(i);
    allQuestions.push({
      question: row.getString('Question'),
      options: {
        A: row.getString('OptionA'),
        B: row.getString('OptionB'),
        C: row.getString('OptionC'),
        D: row.getString('OptionD')
      },
      correct: row.getString('CorrectAnswer')
    });
  }
}

function resetQuiz() {
  // 隨機抽題
  quizQuestions = [];
  let idx = [];
  for (let i = 0; i < allQuestions.length; i++) idx.push(i);
  idx = shuffle(idx);
  for (let i = 0; i < NUM_QUESTIONS; i++) {
    quizQuestions.push(allQuestions[idx[i % idx.length]]);
  }
  currentQuestionIndex = 0;
  score = 0;
  feedbackTimer = 0;
  feedbackText = '';
  fireworks = [];
  feedbackParticles = [];
}

// 小游標繪製
function drawCursor() {
  push();
  noFill();
  stroke(COLORS.text);
  strokeWeight(2);
  circle(mouseX, mouseY, 18);
  pop();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  initBackgroundParticles();
  OPTION_WIDTH = min(windowWidth * 0.8, 800);
}