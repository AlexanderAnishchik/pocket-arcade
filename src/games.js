const W = 720, H = 450;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const randomBetween = rng => (a, b) => a + rng() * (b - a);
const palette = { green: '#bbef8a', amber: '#ffd28a', cyan: '#88e6dc', violet: '#c4a7ed' };

function background(ctx, spacing = 24) {
  ctx.fillStyle = '#101816';
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(159, 192, 165, .045)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0.5; x < W; x += spacing) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
  for (let y = 0.5; y < H; y += spacing) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
  ctx.stroke();
}

function particles(random) {
  let points = [];
  return {
    clear() { points = []; },
    burst(x, y, color, count = 12) {
      for (let i = 0; i < count; i++) points.push({ x, y, vx: random(-140, 140), vy: random(-140, 140), life: random(.2, .5), color });
    },
    update(dt) {
      for (const p of points) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; }
      points = points.filter(p => p.life > 0);
    },
    draw(ctx) {
      for (const p of points) {
        ctx.globalAlpha = Math.min(1, p.life * 3);
        ctx.fillStyle = p.color;
        ctx.fillRect(Math.round(p.x), Math.round(p.y), 3, 3);
      }
      ctx.globalAlpha = 1;
    }
  };
}

const beep = (api, frequency, duration = .06, type = 'square') => api.beep && api.beep(frequency, duration, type);

export function snake(api, rng = Math.random) {
  const random = randomBetween(rng);
  const cell = 24, cols = 28, rows = 17, ox = 24, oy = 21;
  const vectors = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
  const fx = particles(random);
  let body, heading, queue, food, points, elapsed, ended, clock, previousHeld;
  function spawnFood() {
    const empty = [];
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      if (!body.some(s => s.x === x && s.y === y)) empty.push({ x, y });
    }
    food = empty[Math.floor(rng() * empty.length)] || null;
  }
  function direction(dir) {
    if (ended || !vectors[dir] || queue.length >= 2) return;
    const last = vectors[queue.length ? queue[queue.length - 1] : heading];
    const next = vectors[dir];
    if (last[0] === -next[0] && last[1] === -next[1]) return;
    if (last[0] === next[0] && last[1] === next[1]) return;
    queue.push(dir);
  }
  return {
    reset() {
      body = [{ x: 10, y: 8 }, { x: 9, y: 8 }, { x: 8, y: 8 }, { x: 7, y: 8 }];
      heading = 'right'; queue = []; points = 0; elapsed = -.25; clock = 0; ended = false; previousHeld = '';
      spawnFood(); fx.clear(); api.score(0); api.status('SPEED 01');
    },
    direction,
    action() {},
    pointer() {},
    update(dt, input = new Set()) {
      if (ended) return;
      clock += dt; elapsed += dt; fx.update(dt);
      const held = Array.from(input).filter(k => vectors[k]).join(',');
      if (held !== previousHeld && held) direction(held.split(',').pop());
      previousHeld = held;
      const interval = Math.max(.075, .155 - Math.floor(points / 30) * .009);
      while (elapsed >= interval && !ended) {
        elapsed -= interval;
        if (queue.length) heading = queue.shift();
        const v = vectors[heading], head = { x: body[0].x + v[0], y: body[0].y + v[1] };
        const eating = food && head.x === food.x && head.y === food.y;
        const collisionBody = eating ? body : body.slice(0, -1);
        if (head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows || collisionBody.some(s => s.x === head.x && s.y === head.y)) {
          ended = true; beep(api, 100, .2, 'sawtooth'); api.finish(false, 'A little too close. Try a new route.'); return;
        }
        body.unshift(head);
        if (eating) {
          points += 10; api.score(points); api.status('SPEED ' + String(1 + Math.floor(points / 30)).padStart(2, '0'));
          fx.burst(ox + head.x * cell + 12, oy + head.y * cell + 12, palette.amber);
          beep(api, 420 + (points % 70) * 6, .07);
          if (body.length === cols * rows) { ended = true; food = null; api.finish(true, 'A perfect garden. Every square is yours.'); return; }
          spawnFood();
        } else body.pop();
      }
    },
    draw(ctx) {
      background(ctx, cell);
      ctx.strokeStyle = '#324336'; ctx.lineWidth = 1;
      ctx.strokeRect(ox - 4.5, oy - 4.5, cols * cell + 9, rows * cell + 9);
      if (food) {
        const x = ox + food.x * cell, y = oy + food.y * cell;
        ctx.fillStyle = 'rgba(255,210,138,.08)'; ctx.fillRect(x - 3, y - 3, 30, 30);
        ctx.fillStyle = palette.amber; ctx.fillRect(x + 6, y + 7, 13, 13);
        ctx.fillStyle = '#e7f0bc'; ctx.fillRect(x + 12, y + 3, 4, 5);
        ctx.fillStyle = '#fff0ce'; ctx.fillRect(x + 8, y + 9, 3, 3);
      }
      for (let i = body.length - 1; i >= 0; i--) {
        const s = body[i], x = ox + s.x * cell, y = oy + s.y * cell;
        ctx.fillStyle = i === 0 ? palette.green : (i % 2 ? '#7ca963' : '#91bd72');
        ctx.fillRect(x + 2, y + 2, cell - 4, cell - 4);
        if (i > 0) { ctx.fillStyle = 'rgba(215,255,183,.11)'; ctx.fillRect(x + 4, y + 4, cell - 8, 3); }
      }
      const h = body[0], hx = ox + h.x * cell, hy = oy + h.y * cell;
      ctx.fillStyle = '#1c3221';
      if (heading === 'left' || heading === 'right') {
        const ex = hx + (heading === 'right' ? 15 : 6);
        ctx.fillRect(ex, hy + 6, 3, 3); ctx.fillRect(ex, hy + 15, 3, 3);
      } else {
        const ey = hy + (heading === 'down' ? 15 : 6);
        ctx.fillRect(hx + 6, ey, 3, 3); ctx.fillRect(hx + 15, ey, 3, 3);
      }
      fx.draw(ctx);
    },
    inspect() { return { type: 'snake', body: body.map(s => ({ ...s })), food: food && { ...food }, heading, queue: [...queue], score: points, ended, cols, rows }; }
  };
}

export function pong(api, rng = Math.random) {
  const random = randomBetween(rng);
  const paddleW = 12, paddleH = 82, leftX = 36, rightX = W - 48, radius = 6;
  const fx = particles(random);
  let playerY, cpuY, playerPoints, cpuPoints, ball, serve, ended, target, cpuOffset, trail;
  function newBall(toward) {
    const angle = random(-.4, .4);
    ball = { x: W / 2, y: H / 2, vx: toward * Math.cos(angle) * 365, vy: Math.sin(angle) * 365 };
    serve = 1; cpuOffset = random(-27, 27); trail = [];
  }
  function updateScore() { api.score(playerPoints); api.status('YOU ' + playerPoints + ' : ' + cpuPoints + ' CPU'); }
  function point(playerWon) {
    if (playerWon) playerPoints++; else cpuPoints++;
    updateScore(); beep(api, playerWon ? 700 : 150, .15);
    if (playerPoints >= 5 || cpuPoints >= 5) {
      ended = true; api.finish(playerPoints >= 5, playerPoints >= 5 ? 'Five points. One very worthy champion.' : 'The machine takes this round. Rematch?');
    } else newBall(playerWon ? 1 : -1);
  }
  function paddleBounce(y, direction) {
    const hit = clamp((ball.y - (y + paddleH / 2)) / (paddleH / 2), -1, 1);
    const speed = Math.min(660, Math.hypot(ball.vx, ball.vy) * 1.055);
    const angle = hit * 1.02;
    ball.vx = direction * speed * Math.cos(angle);
    ball.vy = speed * Math.sin(angle);
    if (Math.abs(ball.vy) < 30) ball.vy = (rng() < .5 ? -1 : 1) * 30;
    cpuOffset = random(-30, 30);
    fx.burst(ball.x, ball.y, palette.amber, 7); beep(api, direction > 0 ? 370 : 300, .035);
  }
  return {
    reset() {
      playerY = cpuY = (H - paddleH) / 2; playerPoints = cpuPoints = 0; target = null; ended = false;
      fx.clear(); newBall(rng() < .5 ? 1 : -1); updateScore();
    },
    direction() {}, action() {},
    pointer(x, y) { target = clamp(y - paddleH / 2, 18, H - paddleH - 18); },
    update(dt, input = new Set()) {
      if (ended) return;
      fx.update(dt);
      const movement = (input.has('down') ? 1 : 0) - (input.has('up') ? 1 : 0);
      if (movement) { playerY += movement * 470 * dt; target = null; }
      else if (target !== null) playerY += clamp(target - playerY, -850 * dt, 850 * dt);
      playerY = clamp(playerY, 18, H - paddleH - 18);
      const cpuTarget = (ball.vx > 0 && serve <= 0 ? ball.y + cpuOffset : H / 2) - paddleH / 2;
      cpuY = clamp(cpuY + clamp(cpuTarget - cpuY, -265 * dt, 265 * dt), 18, H - paddleH - 18);
      if (serve > 0) { serve -= dt; return; }
      const steps = Math.max(1, Math.ceil(dt / .006)), step = dt / steps;
      for (let i = 0; i < steps && !ended; i++) {
        const oldX = ball.x;
        ball.x += ball.vx * step; ball.y += ball.vy * step;
        if (ball.y < 18 + radius) { ball.y = 18 + radius; ball.vy = Math.abs(ball.vy); beep(api, 220, .025); }
        if (ball.y > H - 18 - radius) { ball.y = H - 18 - radius; ball.vy = -Math.abs(ball.vy); beep(api, 220, .025); }
        if (ball.vx < 0 && oldX - radius >= leftX + paddleW && ball.x - radius <= leftX + paddleW && ball.y + radius >= playerY && ball.y - radius <= playerY + paddleH) {
          ball.x = leftX + paddleW + radius; paddleBounce(playerY, 1);
        } else if (ball.vx > 0 && oldX + radius <= rightX && ball.x + radius >= rightX && ball.y + radius >= cpuY && ball.y - radius <= cpuY + paddleH) {
          ball.x = rightX - radius; paddleBounce(cpuY, -1);
        }
        if (ball.x < -radius) { point(false); break; }
        if (ball.x > W + radius) { point(true); break; }
      }
      trail.push({ x: ball.x, y: ball.y }); if (trail.length > 7) trail.shift();
    },
    draw(ctx) {
      background(ctx, 30);
      ctx.fillStyle = '#304139'; ctx.fillRect(24, 17, W - 48, 2); ctx.fillRect(24, H - 19, W - 48, 2);
      ctx.fillStyle = '#2b3b32'; for (let y = 28; y < H - 28; y += 20) ctx.fillRect(W / 2 - 1, y, 2, 9);
      ctx.strokeStyle = '#293b31'; ctx.lineWidth = 1; ctx.strokeRect(W / 2 - 45.5, H / 2 - 45.5, 91, 91);
      ctx.fillStyle = palette.amber; ctx.fillRect(leftX, Math.round(playerY), paddleW, paddleH);
      ctx.fillStyle = '#f8e8cb'; ctx.fillRect(leftX, Math.round(playerY), 3, paddleH);
      ctx.fillStyle = '#8e9d86'; ctx.fillRect(rightX, Math.round(cpuY), paddleW, paddleH);
      ctx.fillStyle = '#bec5aa'; ctx.fillRect(rightX + paddleW - 3, Math.round(cpuY), 3, paddleH);
      for (let i = 0; i < trail.length; i++) {
        ctx.globalAlpha = i / trail.length * .18; ctx.fillStyle = palette.amber;
        ctx.fillRect(trail[i].x - radius, trail[i].y - radius, radius * 2, radius * 2);
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#fff1cf'; ctx.fillRect(Math.round(ball.x - radius), Math.round(ball.y - radius), radius * 2, radius * 2);
      if (serve > 0) {
        ctx.font = '11px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#8f9f8d';
        ctx.fillText('FIRST TO 5', W / 2, H / 2 + 70);
      }
      fx.draw(ctx);
    },
    inspect() { return { type: 'pong', ball: { ...ball }, playerY, cpuY, playerPoints, cpuPoints, serve, ended, paddleH, leftX, rightX }; }
  };
}

export function breakout(api, rng = Math.random) {
  const random = randomBetween(rng);
  const radius = 7, paddleY = 395, paddleW = 104, paddleH = 12;
  const brickW = 58, brickH = 22, columns = 10, rows = 4, gap = 6, startX = 43, startY = 46;
  const colors = [palette.violet, '#9aabe8', '#80c5dd', palette.cyan];
  const fx = particles(random);
  let paddleX, ball, bricks, lives, points, serve, ended, target, trail;
  function newBall() {
    const vx = (rng() < .5 ? -1 : 1) * 140;
    ball = { x: paddleX + paddleW / 2, y: paddleY - 12, vx, vy: -Math.sqrt(350 * 350 - vx * vx) };
    serve = 1.1; trail = [];
  }
  function updateStatus() { api.status(lives + (lives === 1 ? ' LIFE' : ' LIVES') + ' / ' + bricks.filter(b => b.alive).length + ' BRICKS'); }
  function hitBrick(b) {
    b.alive = false; points += (rows - b.row) * 10; api.score(points); updateStatus();
    fx.burst(b.x + brickW / 2, b.y + brickH / 2, colors[b.row]); beep(api, 420 + (rows - b.row) * 110, .045);
    const factor = Math.min(1.008, 510 / Math.hypot(ball.vx, ball.vy)); ball.vx *= factor; ball.vy *= factor;
    if (!bricks.some(brick => brick.alive)) { ended = true; api.finish(true, 'Clean slate. Every last brick, gone.'); }
  }
  return {
    reset() {
      paddleX = (W - paddleW) / 2; target = null; lives = 3; points = 0; ended = false;
      bricks = [];
      for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) bricks.push({ x: startX + col * (brickW + gap), y: startY + row * (brickH + gap), row, alive: true });
      fx.clear(); newBall(); api.score(0); updateStatus();
    },
    direction() {}, action() {},
    pointer(x) { target = clamp(x - paddleW / 2, 20, W - paddleW - 20); },
    update(dt, input = new Set()) {
      if (ended) return;
      fx.update(dt);
      const movement = (input.has('right') ? 1 : 0) - (input.has('left') ? 1 : 0);
      if (movement) { paddleX += movement * 500 * dt; target = null; }
      else if (target !== null) paddleX += clamp(target - paddleX, -950 * dt, 950 * dt);
      paddleX = clamp(paddleX, 20, W - paddleW - 20);
      if (serve > 0) { serve -= dt; ball.x = paddleX + paddleW / 2; ball.y = paddleY - radius - 3; return; }
      const steps = Math.max(1, Math.ceil(dt / .004)), step = dt / steps;
      for (let i = 0; i < steps && !ended; i++) {
        const oldY = ball.y;
        ball.x += ball.vx * step; ball.y += ball.vy * step;
        if (ball.x < 18 + radius) { ball.x = 18 + radius; ball.vx = Math.abs(ball.vx); beep(api, 200, .02); }
        if (ball.x > W - 18 - radius) { ball.x = W - 18 - radius; ball.vx = -Math.abs(ball.vx); beep(api, 200, .02); }
        if (ball.y < 18 + radius) { ball.y = 18 + radius; ball.vy = Math.abs(ball.vy); beep(api, 200, .02); }
        if (ball.vy > 0 && oldY + radius <= paddleY + 3 && ball.y + radius >= paddleY && ball.x + radius >= paddleX && ball.x - radius <= paddleX + paddleW) {
          const hit = clamp((ball.x - paddleX - paddleW / 2) / (paddleW / 2), -1, 1);
          const speed = Math.min(510, Math.hypot(ball.vx, ball.vy) + 5);
          ball.vx = speed * Math.sin(hit * 1.08);
          if (Math.abs(ball.vx) < 65) ball.vx = (hit < 0 ? -1 : 1) * 65;
          ball.vy = -Math.sqrt(speed * speed - ball.vx * ball.vx);
          ball.y = paddleY - radius; fx.burst(ball.x, paddleY, palette.cyan, 5); beep(api, 280, .03);
        }
        for (const b of bricks) {
          if (!b.alive) continue;
          const closestX = clamp(ball.x, b.x, b.x + brickW), closestY = clamp(ball.y, b.y, b.y + brickH);
          const dx = ball.x - closestX, dy = ball.y - closestY, distanceSquared = dx * dx + dy * dy;
          if (distanceSquared >= radius * radius) continue;
          let nx, ny, penetration;
          if (distanceSquared > .000001) {
            const distance = Math.sqrt(distanceSquared); nx = dx / distance; ny = dy / distance; penetration = radius - distance;
          } else {
            const sides = [{ d: ball.x - b.x, x: -1, y: 0 }, { d: b.x + brickW - ball.x, x: 1, y: 0 }, { d: ball.y - b.y, x: 0, y: -1 }, { d: b.y + brickH - ball.y, x: 0, y: 1 }];
            sides.sort((a, z) => a.d - z.d); nx = sides[0].x; ny = sides[0].y; penetration = sides[0].d + radius;
          }
          ball.x += nx * (penetration + .1); ball.y += ny * (penetration + .1);
          const projection = ball.vx * nx + ball.vy * ny;
          if (projection < 0) { ball.vx -= 2 * projection * nx; ball.vy -= 2 * projection * ny; }
          // Avoid indefinitely shallow rallies after a corner impact.
          if (Math.abs(ball.vy) < 105) {
            const speed = Math.hypot(ball.vx, ball.vy); ball.vy = (ball.vy < 0 ? -1 : 1) * 105;
            ball.vx = (ball.vx < 0 ? -1 : 1) * Math.sqrt(Math.max(0, speed * speed - ball.vy * ball.vy));
          }
          hitBrick(b); break;
        }
        if (ball.y > H + radius) {
          lives--; updateStatus(); beep(api, 110, .18);
          if (lives <= 0) { ended = true; api.finish(false, 'Out of lives. Those bricks want a rematch.'); }
          else newBall();
          break;
        }
      }
      trail.push({ x: ball.x, y: ball.y }); if (trail.length > 6) trail.shift();
    },
    draw(ctx) {
      background(ctx, 24);
      ctx.strokeStyle = '#2c403c'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(17.5, H - 22); ctx.lineTo(17.5, 17.5); ctx.lineTo(W - 17.5, 17.5); ctx.lineTo(W - 17.5, H - 22); ctx.stroke();
      for (const b of bricks) {
        if (!b.alive) continue;
        ctx.fillStyle = colors[b.row]; ctx.fillRect(b.x, b.y, brickW, brickH);
        ctx.fillStyle = 'rgba(255,255,255,.20)'; ctx.fillRect(b.x + 2, b.y + 2, brickW - 4, 3);
        ctx.fillStyle = 'rgba(15,28,30,.18)'; ctx.fillRect(b.x, b.y + brickH - 3, brickW, 3);
      }
      ctx.fillStyle = '#8ce9dc'; ctx.fillRect(Math.round(paddleX), paddleY, paddleW, paddleH);
      ctx.fillStyle = '#dcfff2'; ctx.fillRect(Math.round(paddleX + 5), paddleY, paddleW - 10, 3);
      ctx.fillStyle = '#4d918a'; ctx.fillRect(Math.round(paddleX), paddleY, 5, paddleH); ctx.fillRect(Math.round(paddleX + paddleW - 5), paddleY, 5, paddleH);
      for (let i = 0; i < trail.length; i++) {
        ctx.globalAlpha = i / trail.length * .15; ctx.fillStyle = '#d9f4dd';
        ctx.fillRect(trail[i].x - 5, trail[i].y - 5, 10, 10);
      }
      ctx.globalAlpha = 1; ctx.fillStyle = '#eaf9db'; ctx.fillRect(Math.round(ball.x - 6), Math.round(ball.y - 6), 12, 12);
      fx.draw(ctx);
    },
    inspect() { return { type: 'breakout', ball: { ...ball }, paddleX, paddleY, paddleW, lives, score: points, bricks: bricks.map(b => ({ ...b, w: brickW, h: brickH })), serve, ended }; }
  };
}

export function airhockey(api, rng = Math.random) {
  const random = randomBetween(rng);
  const left = 26, right = W - 26, top = 26, bottom = H - 26;
  const goalTop = H / 2 - 72, goalBottom = H / 2 + 72;
  const malletRadius = 24, puckRadius = 10, postRadius = 5, winningScore = 7;
  const playerColor = palette.cyan, cpuColor = '#ed9b85', fx = particles(random);
  let player, cpu, puck, playerPoints, cpuPoints, target, cpuTarget, reaction;
  let serve, ended, trail, message, idle;

  function updateScore() {
    api.score(playerPoints);
    api.status('YOU ' + playerPoints + ' : ' + cpuPoints + ' CPU');
  }
  function faceoff(toward, label) {
    player = { x: 126, y: H / 2, vx: 0, vy: 0 };
    cpu = { x: W - 126, y: H / 2, vx: 0, vy: 0 };
    puck = { x: W / 2, y: H / 2, vx: toward * 290, vy: random(-105, 105) };
    target = null; cpuTarget = { x: cpu.x, y: cpu.y }; reaction = 0;
    serve = 1.15; idle = 0; trail = []; message = label;
  }
  function point(playerWon) {
    if (playerWon) playerPoints++; else cpuPoints++;
    fx.burst(playerWon ? right : left, puck.y, playerWon ? playerColor : cpuColor, 24);
    updateScore(); beep(api, playerWon ? 780 : 160, .18, 'triangle');
    if (playerPoints === winningScore || cpuPoints === winningScore) {
      ended = true;
      api.finish(playerWon, playerWon ? 'Seven goals. You own the rink!' : 'The CPU takes the rink. Time for a rematch?');
    } else faceoff(playerWon ? 1 : -1, playerWon ? 'YOU SCORE!' : 'CPU SCORES');
  }
  function moveMallet(mallet, x, y, speed, dt, isPlayer) {
    x = clamp(x, isPlayer ? left + malletRadius : W / 2 + malletRadius,
      isPlayer ? W / 2 - malletRadius : right - malletRadius);
    y = clamp(y, top + malletRadius, bottom - malletRadius);
    const dx = x - mallet.x, dy = y - mallet.y, distance = Math.hypot(dx, dy);
    const ratio = distance ? Math.min(1, speed * dt / distance) : 0;
    mallet.vx = dx * ratio / dt; mallet.vy = dy * ratio / dt;
    mallet.x += dx * ratio; mallet.y += dy * ratio;
  }
  function hitMallet(mallet, color) {
    const dx = puck.x - mallet.x, dy = puck.y - mallet.y;
    const distance = Math.hypot(dx, dy), separation = malletRadius + puckRadius;
    if (distance >= separation) return;
    const nx = distance > .001 ? dx / distance : (mallet === player ? 1 : -1);
    const ny = distance > .001 ? dy / distance : 0;
    puck.x = mallet.x + nx * (separation + .05);
    puck.y = mallet.y + ny * (separation + .05);
    // Reflect relative velocity so a moving mallet transfers momentum to the puck.
    const approach = (puck.vx - mallet.vx) * nx + (puck.vy - mallet.vy) * ny;
    if (approach < 0) {
      puck.vx -= 1.9 * approach * nx; puck.vy -= 1.9 * approach * ny;
      fx.burst(puck.x, puck.y, color, 5);
      beep(api, mallet === player ? 420 : 310, .035, 'triangle');
    }
  }
  function hitPost(x, y) {
    const dx = puck.x - x, dy = puck.y - y, distance = Math.hypot(dx, dy);
    const separation = puckRadius + postRadius;
    if (distance >= separation) return;
    const nx = distance > .001 ? dx / distance : (x === left ? 1 : -1);
    const ny = distance > .001 ? dy / distance : 0;
    puck.x = x + nx * (separation + .05); puck.y = y + ny * (separation + .05);
    const approach = puck.vx * nx + puck.vy * ny;
    if (approach < 0) { puck.vx -= 2 * approach * nx; puck.vy -= 2 * approach * ny; }
  }
  function walls() {
    let bounced = false;
    if (puck.y < top + puckRadius) { puck.y = top + puckRadius; puck.vy = Math.abs(puck.vy); bounced = true; }
    if (puck.y > bottom - puckRadius) { puck.y = bottom - puckRadius; puck.vy = -Math.abs(puck.vy); bounced = true; }
    if (puck.y <= goalTop || puck.y >= goalBottom) {
      if (puck.x < left + puckRadius) { puck.x = left + puckRadius; puck.vx = Math.abs(puck.vx); bounced = true; }
      if (puck.x > right - puckRadius) { puck.x = right - puckRadius; puck.vx = -Math.abs(puck.vx); bounced = true; }
    }
    for (const x of [left, right]) for (const y of [goalTop, goalBottom]) hitPost(x, y);
    if (bounced) beep(api, 210, .025, 'triangle');
    // Give nearly vertical rallies a gentle sideways drift to keep the match moving.
    if (bounced && Math.abs(puck.vx) < 70) puck.vx = puck.x < W / 2 ? 70 : -70;
  }
  function aimCPU(dt) {
    reaction -= dt;
    if (reaction > 0) return;
    reaction = .10;
    if (puck.x > W / 2 + 18) {
      // Get behind a slow puck, then strike toward the player's goal.
      cpuTarget = {
        x: puck.x + (cpu.x < puck.x + 12 ? 58 : -22),
        y: puck.y + (cpu.x < puck.x + 12 ? (puck.y < H / 2 ? 38 : -38) : 0)
      };
    } else {
      cpuTarget = { x: right - 100, y: H / 2 + (puck.y - H / 2) * .55 };
    }
  }
  function circle(ctx, x, y, radius, fill, stroke) {
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }
  function drawMallet(ctx, mallet, color) {
    circle(ctx, mallet.x, mallet.y + 4, malletRadius + 2, '#081712');
    ctx.lineWidth = 3; circle(ctx, mallet.x, mallet.y, malletRadius, color, '#ecfff2');
    ctx.lineWidth = 2; circle(ctx, mallet.x, mallet.y, 13, '#172d28', color);
    circle(ctx, mallet.x - 4, mallet.y - 5, 4, '#ffffff66');
  }
  return {
    reset() {
      playerPoints = cpuPoints = 0; ended = false; fx.clear();
      faceoff(-1, 'FIRST TO 7'); updateScore();
    },
    direction() {}, action() {},
    pointer(x, y) { if (Number.isFinite(x) && Number.isFinite(y)) target = { x, y }; },
    releaseInput() { target = null; },
    update(dt, input = new Set()) {
      if (ended || !Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, .05); fx.update(dt);
      const mx = Number(input.has('right')) - Number(input.has('left'));
      const my = Number(input.has('down')) - Number(input.has('up'));
      const moving = mx !== 0 || my !== 0, length = Math.hypot(mx, my) || 1;
      if (moving) target = null;
      // Move mallets and puck together in small steps, including fast pointer swipes.
      const steps = Math.ceil(dt / (1 / 240)), step = dt / steps;
      for (let i = 0; i < steps; i++) {
        const destination = moving ? { x: player.x + mx / length * 500 * step, y: player.y + my / length * 500 * step } : target || player;
        moveMallet(player, destination.x, destination.y, moving ? 500 : 740, step, true);
        if (serve > 0) { serve = Math.max(0, serve - step); continue; }
        aimCPU(step);
        moveMallet(cpu, cpuTarget.x, cpuTarget.y, 300 + cpuPoints * 5, step, false);
        puck.x += puck.vx * step; puck.y += puck.vy * step;
        hitMallet(player, playerColor); hitMallet(cpu, cpuColor); walls();
        if (puck.x < left - puckRadius) { point(false); break; }
        if (puck.x > right + puckRadius) { point(true); break; }
        const speed = Math.hypot(puck.vx, puck.vy);
        const friction = speed > 160 ? Math.exp(-.08 * step) : 1;
        const ratio = Math.min(friction, 980 / (speed || 1));
        puck.vx *= ratio; puck.vy *= ratio;
        idle = speed < 100 ? idle + step : 0;
        if (idle > 1.5) { puck.vx = puck.x < W / 2 ? -160 : 160; puck.vy = random(-70, 70); idle = 0; }
      }
      if (serve <= 0) { trail.push({ x: puck.x, y: puck.y }); if (trail.length > 9) trail.shift(); }
    },
    draw(ctx) {
      background(ctx, 24);
      ctx.fillStyle = '#142721'; ctx.fillRect(left, top, right - left, bottom - top);
      ctx.fillStyle = '#88e6dc04'; ctx.fillRect(left, top, W / 2 - left, bottom - top);
      ctx.fillStyle = '#ed9b8505'; ctx.fillRect(W / 2, top, right - W / 2, bottom - top);
      ctx.fillStyle = '#456155';
      for (let x = 48; x < right; x += 24) for (let y = 48; y < bottom; y += 24) ctx.fillRect(x, y, 1, 1);
      ctx.lineWidth = 2; ctx.strokeStyle = '#39564c';
      ctx.setLineDash([6, 9]); ctx.beginPath(); ctx.moveTo(W / 2, top); ctx.lineTo(W / 2, bottom); ctx.stroke(); ctx.setLineDash([]);
      circle(ctx, W / 2, H / 2, 66, null, '#39564c'); circle(ctx, W / 2, H / 2, 5, '#39564c');
      for (const [x, color] of [[left, playerColor], [right, cpuColor]]) {
        ctx.save(); ctx.beginPath(); ctx.rect(left, top, right - left, bottom - top); ctx.clip();
        ctx.globalAlpha = .2; circle(ctx, x, H / 2, 102, null, color); ctx.restore();
        ctx.fillStyle = color; ctx.globalAlpha = .14;
        ctx.fillRect(x === left ? 5 : right, goalTop, 21, goalBottom - goalTop); ctx.globalAlpha = 1;
        ctx.strokeStyle = color; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(x, goalTop); ctx.lineTo(x, top); ctx.lineTo(W / 2, top);
        ctx.moveTo(x, goalBottom); ctx.lineTo(x, bottom); ctx.lineTo(W / 2, bottom); ctx.stroke();
        circle(ctx, x, goalTop, postRadius, '#e2edcf'); circle(ctx, x, goalBottom, postRadius, '#e2edcf');
      }
      ctx.textAlign = 'center'; ctx.font = 'bold 58px monospace'; ctx.globalAlpha = .14;
      ctx.fillStyle = playerColor; ctx.fillText(playerPoints, W / 2 - 86, 126);
      ctx.fillStyle = cpuColor; ctx.fillText(cpuPoints, W / 2 + 86, 126); ctx.globalAlpha = 1;
      ctx.font = '12px monospace'; ctx.fillStyle = playerColor; ctx.fillText('YOU', 145, bottom - 18);
      ctx.fillStyle = '#93a69a'; ctx.fillText('FIRST TO 7', W / 2, bottom - 18);
      ctx.fillStyle = cpuColor; ctx.fillText('CPU', W - 145, bottom - 18);
      for (let i = 0; i < trail.length; i++) {
        ctx.globalAlpha = i / trail.length * .2;
        circle(ctx, trail[i].x, trail[i].y, puckRadius * (.5 + i / trail.length * .5), '#fff0c9');
      }
      ctx.globalAlpha = 1;
      drawMallet(ctx, player, playerColor); drawMallet(ctx, cpu, cpuColor);
      circle(ctx, puck.x, puck.y + 3, puckRadius, '#081712');
      ctx.lineWidth = 2; circle(ctx, puck.x, puck.y, puckRadius, '#fff0c9', '#dcb56c');
      circle(ctx, puck.x - 3, puck.y - 3, 3, '#ffffff');
      if (serve > 0 && !ended) {
        ctx.fillStyle = '#10221feb'; ctx.fillRect(W / 2 - 110, H / 2 + 84, 220, 34);
        ctx.font = 'bold 14px monospace'; ctx.fillStyle = '#e2edcf';
        ctx.fillText(message + ' · ' + Math.ceil(serve), W / 2, H / 2 + 106);
      }
      fx.draw(ctx);
    },
    inspect() {
      return { type: 'airhockey', player: { ...player }, cpu: { ...cpu }, puck: { ...puck },
        playerPoints, cpuPoints, serve, ended, malletRadius, puckRadius, postRadius, winningScore,
        rink: { left, right, top, bottom, goalTop, goalBottom } };
    }
  };
}

export function shuffleboard(api, rng = Math.random) {
  const random = randomBetween(rng);
  const table = { left: 48, right: 674, top: 110, bottom: 324 };
  const zones = [470, 538, 606], radius = 11, friction = 230, chargeSeconds = 1.65;
  const origin = { x: 94, y: 217 }, maxAngle = .28, pucksPerRound = 4, rounds = 3;
  const colors = { player: palette.cyan, cpu: '#ed9b85' }, fx = particles(random);
  let pucks, used, totals, round, turn, stage, charging, power, aim, ended;
  let timer, settled, cpuPlan, roundResult, lastShot, nextId, lastControls;
  const distanceFor = value => 65 + value * 720;
  const powerFor = distance => clamp((distance - 65) / 720, 0, 1);

  function pointsFor(puck) {
    const epsilon = 1e-6;
    if (puck.out || puck.x + radius > table.right + epsilon || puck.x - radius < table.left - epsilon ||
        puck.y - radius < table.top - epsilon || puck.y + radius > table.bottom + epsilon) return 0;
    // The whole puck must cross a scoring line to earn the higher zone.
    for (let i = zones.length - 1; i >= 0; i--) if (puck.x - radius >= zones[i] - epsilon) return i + 1;
    return 0;
  }
  function tableScore() {
    const result = { player: 0, cpu: 0 };
    for (const puck of pucks) result[puck.owner] += pointsFor(puck);
    return result;
  }
  function updateControls() {
    const canShoot = !ended && stage === 'aiming' && turn === 'player';
    const value = Math.round(power * 100);
    const label = ended ? 'Match complete' : stage === 'roundOver' ? 'Next round soon' :
      stage === 'sliding' ? 'Pucks in motion' : turn === 'cpu' ? 'CPU is aiming…' :
      charging ? 'Release · ' + value + '%' : 'Hold to shoot';
    const signature = [canShoot, charging, value, label].join(':');
    if (signature !== lastControls) {
      lastControls = signature;
      api.shot?.({ canShoot, charging, power: value, label });
    }
  }
  function status() {
    api.status('YOU ' + totals.player + ' : ' + totals.cpu + ' CPU');
    updateControls();
  }
  function planCPU() {
    const opponents = pucks.filter(p => p.owner === 'player' && pointsFor(p) > 0);
    let target = { x: random(575, 647), y: random(153, 281) };
    let extra = 0;
    if (opponents.length && rng() < .42) {
      target = opponents[Math.floor(rng() * opponents.length)];
      extra = random(48, 100);
    } else {
      // Prefer an open lane, with a little imperfect judgement.
      for (let attempt = 0; attempt < 5; attempt++) {
        if (!pucks.some(p => !p.out && Math.hypot(target.x - p.x, target.y - p.y) < 36)) break;
        target = { x: random(575, 647), y: random(153, 281) };
      }
    }
    return { angle: clamp(Math.atan2(target.y - origin.y, target.x - origin.x), -maxAngle, maxAngle),
      power: powerFor(Math.hypot(target.x - origin.x, target.y - origin.y) + extra) };
  }
  function beginTurn(owner) {
    turn = owner; stage = 'aiming'; timer = settled = power = 0; charging = false;
    cpuPlan = owner === 'cpu' ? planCPU() : null;
    status();
  }
  function beginRound() {
    pucks = []; used = { player: 0, cpu: 0 }; roundResult = null; aim = 0;
    beginTurn(round % 2 ? 'player' : 'cpu');
  }
  function launch(owner, strength, angle) {
    const distance = distanceFor(strength) * random(.94, 1.06);
    // Powerful shots trade accuracy for reach, for both the player and CPU.
    const spread = .008 + .065 * strength * strength;
    const heading = angle + random(-spread, spread), speed = Math.sqrt(2 * friction * distance);
    const puck = { id: nextId++, owner, x: origin.x, y: origin.y,
      vx: Math.cos(heading) * speed, vy: Math.sin(heading) * speed,
      drag: friction * random(.97, 1.03), curl: random(-.012, .012), out: false };
    pucks.push(puck); used[owner]++; lastShot = { owner, power: strength, angle: heading, speed };
    stage = 'sliding'; charging = false; power = 0; settled = 0;
    beep(api, owner === 'player' ? 430 : 300, .07, 'triangle'); updateControls();
  }
  function finishRound() {
    roundResult = tableScore();
    totals.player += roundResult.player; totals.cpu += roundResult.cpu;
    api.score(totals.player);
    if (round >= rounds && totals.player !== totals.cpu) {
      ended = true; stage = 'over'; status();
      const won = totals.player > totals.cpu;
      api.finish(won, (won ? 'You take the table! ' : 'The CPU takes the table. ') +
        totals.player + '–' + totals.cpu + ' after ' + round + ' rounds.');
    } else {
      stage = 'roundOver'; timer = 2.8; status();
      beep(api, roundResult.player >= roundResult.cpu ? 660 : 190, .15, 'triangle');
    }
  }
  function collide(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y, distance = Math.hypot(dx, dy);
    if (distance >= radius * 2) return;
    const nx = distance > .001 ? dx / distance : 1, ny = distance > .001 ? dy / distance : 0;
    const overlap = (radius * 2 - distance + .01) / 2;
    a.x -= nx * overlap; a.y -= ny * overlap; b.x += nx * overlap; b.y += ny * overlap;
    const approach = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (approach <= 0) return;
    const impulse = approach * .94;
    a.vx -= impulse * nx; a.vy -= impulse * ny; b.vx += impulse * nx; b.vy += impulse * ny;
    if (approach > 35) { fx.burst((a.x + b.x) / 2, (a.y + b.y) / 2, '#ffe2aa', 6); beep(api, 720, .035, 'triangle'); }
  }
  function fall(puck) {
    if (puck.out) return;
    if (puck.x < table.left || puck.x > table.right || puck.y < table.top || puck.y > table.bottom) {
      puck.out = true; puck.vx = puck.vy = 0;
      fx.burst(puck.x, puck.y, colors[puck.owner], 10); beep(api, 140, .07, 'triangle');
    }
  }
  function physics(dt) {
    const steps = Math.ceil(dt * 240), step = dt / steps;
    for (let i = 0; i < steps; i++) {
      for (const puck of pucks) {
        if (puck.out) continue;
        const speed = Math.hypot(puck.vx, puck.vy);
        if (speed > 0) {
          const next = Math.max(0, speed - puck.drag * step);
          const heading = Math.atan2(puck.vy, puck.vx) + puck.curl * step;
          const travel = (speed + next) / 2 * Math.min(step, speed / puck.drag);
          puck.x += Math.cos(heading) * travel; puck.y += Math.sin(heading) * travel;
          puck.vx = Math.cos(heading) * next; puck.vy = Math.sin(heading) * next;
        }
        fall(puck);
      }
      for (let a = 0; a < pucks.length; a++) for (let b = a + 1; b < pucks.length; b++) {
        if (!pucks[a].out && !pucks[b].out) collide(pucks[a], pucks[b]);
      }
      for (const puck of pucks) fall(puck);
    }
  }
  function circle(ctx, x, y, size, fill) {
    ctx.beginPath(); ctx.arc(x, y, size, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  }
  function drawPuck(ctx, puck, ghost = false) {
    if (puck.out) return;
    ctx.globalAlpha = ghost ? .65 : 1;
    circle(ctx, puck.x, puck.y + 3, radius + 1, '#07161180');
    circle(ctx, puck.x, puck.y, radius, colors[puck.owner]);
    circle(ctx, puck.x, puck.y, radius - 4, puck.owner === 'player' ? '#33786d' : '#935845');
    circle(ctx, puck.x - 3, puck.y - 4, 2.5, '#ffffffb0');
    const points = ghost ? 0 : pointsFor(puck);
    if (points && !puck.vx && !puck.vy) {
      ctx.font = 'bold 12px monospace'; ctx.textAlign = 'center'; ctx.fillStyle = '#fff8e7';
      ctx.fillText(points, puck.x, puck.y + 4);
    }
    ctx.globalAlpha = 1;
  }
  return {
    reset() {
      totals = { player: 0, cpu: 0 }; round = 1; nextId = 1; ended = false;
      lastShot = null; lastControls = ''; fx.clear(); api.score(0); beginRound();
    },
    beginShot() {
      if (ended || stage !== 'aiming' || turn !== 'player' || charging) return false;
      charging = true; power = 0; updateControls(); return true;
    },
    releaseShot() {
      if (charging && !ended && stage === 'aiming' && turn === 'player') launch('player', power, aim);
    },
    releaseInput() { charging = false; power = 0; updateControls(); },
    releasePointer() {},
    direction(dir) {
      if (stage === 'aiming' && turn === 'player') aim = clamp(aim + (dir === 'up' || dir === 'left' ? -.018 : .018), -maxAngle, maxAngle);
    },
    pointer(x, y) {
      if (!Number.isFinite(x) || !Number.isFinite(y) || stage !== 'aiming' || turn !== 'player') return;
      aim = clamp(Math.atan2(y - origin.y, Math.max(200, x - origin.x)), -maxAngle, maxAngle);
    },
    update(dt, input = new Set()) {
      if (ended || !Number.isFinite(dt) || dt <= 0) return;
      dt = Math.min(dt, .05); fx.update(dt);
      if (stage === 'aiming') {
        if (turn === 'player') {
          const direction = Number(input.has('down') || input.has('right')) - Number(input.has('up') || input.has('left'));
          aim = clamp(aim + direction * .32 * dt, -maxAngle, maxAngle);
          if (charging) power = Math.min(1, power + dt / chargeSeconds);
        } else {
          timer += dt; power = cpuPlan.power * clamp((timer - .35) / .95, 0, 1);
          if (timer >= 1.3) launch('cpu', cpuPlan.power, cpuPlan.angle);
        }
      } else if (stage === 'sliding') {
        physics(dt);
        if (pucks.every(p => p.out || (!p.vx && !p.vy))) settled += dt;
        else settled = 0;
        if (settled >= .65) {
          if (used.player === pucksPerRound && used.cpu === pucksPerRound) finishRound();
          else beginTurn(turn === 'player' ? 'cpu' : 'player');
        }
      } else if (stage === 'roundOver') {
        timer -= dt;
        if (timer <= 0) { round++; beginRound(); }
      }
      updateControls();
    },
    draw(ctx) {
      background(ctx, 24);
      ctx.textAlign = 'left'; ctx.font = 'bold 23px monospace'; ctx.fillStyle = colors.player;
      ctx.fillText('YOU ' + totals.player, 45, 37);
      ctx.textAlign = 'right'; ctx.fillStyle = colors.cpu; ctx.fillText('CPU ' + totals.cpu, 675, 37);
      ctx.textAlign = 'center'; ctx.font = 'bold 16px monospace'; ctx.fillStyle = '#dfd7b9';
      ctx.fillText(round > rounds ? 'TIEBREAK ' + (round - rounds) : 'ROUND ' + round + ' / ' + rounds, W / 2, 35);
      for (let i = 0; i < pucksPerRound; i++) {
        circle(ctx, 54 + i * 23, 60, 6, i < used.player ? '#2b4942' : colors.player);
        circle(ctx, 666 - i * 23, 60, 6, i < used.cpu ? '#4a3730' : colors.cpu);
      }
      ctx.font = '12px monospace'; ctx.fillStyle = '#97a996'; ctx.fillText('4 PUCKS EACH · 1 vs CPU', W / 2, 62);
      // A warm wooden table inset into the arcade's dark screen.
      ctx.fillStyle = '#09110e'; ctx.fillRect(29, 90, 664, 254);
      ctx.fillStyle = '#574634'; ctx.fillRect(36, 98, 650, 238);
      ctx.fillStyle = '#b69a67'; ctx.fillRect(table.left, table.top, table.right - table.left, table.bottom - table.top);
      for (let y = table.top; y < table.bottom; y += 36) {
        ctx.fillStyle = y % 72 < 36 ? '#ffffff09' : '#51321c0a'; ctx.fillRect(table.left, y, table.right - table.left, 36);
        ctx.fillStyle = '#674a2b22'; ctx.fillRect(table.left, y, table.right - table.left, 1);
      }
      for (let i = 0; i < zones.length; i++) {
        const x = zones[i], end = zones[i + 1] || table.right;
        ctx.fillStyle = ['#254a3b22', '#254a3b38', '#254a3b55'][i]; ctx.fillRect(x, table.top, end - x, table.bottom - table.top);
        ctx.fillStyle = '#31483bbc'; ctx.fillRect(x, table.top, 2, table.bottom - table.top);
        ctx.textAlign = 'center'; ctx.font = 'bold 33px monospace'; ctx.fillStyle = '#213e30c0';
        ctx.fillText(i + 1, (x + end) / 2, 150); ctx.fillText(i + 1, (x + end) / 2, 307);
      }
      ctx.strokeStyle = '#654e2e66'; ctx.lineWidth = 1; ctx.setLineDash([3, 7]);
      ctx.beginPath(); ctx.moveTo(151, table.top + 10); ctx.lineTo(151, table.bottom - 10); ctx.stroke(); ctx.setLineDash([]);
      ctx.textAlign = 'center'; ctx.font = '12px monospace'; ctx.fillStyle = '#5a472c'; ctx.fillText('SLIDE →', 265, 137);
      if (stage === 'aiming' && !ended) {
        const angle = turn === 'player' ? aim : cpuPlan.angle;
        const length = charging || turn === 'cpu' ? distanceFor(power) : 115;
        const x = origin.x + Math.cos(angle) * length, y = origin.y + Math.sin(angle) * length;
        ctx.save(); ctx.beginPath(); ctx.rect(table.left, table.top, table.right - table.left, table.bottom - table.top); ctx.clip();
        ctx.strokeStyle = '#244f45b0'; ctx.lineWidth = 2; ctx.setLineDash([5, 7]);
        ctx.beginPath(); ctx.moveTo(origin.x, origin.y); ctx.lineTo(x, y); ctx.stroke();
        ctx.beginPath(); ctx.arc(x, y, radius + 3, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        drawPuck(ctx, { ...origin, owner: turn }, true);
      }
      for (const puck of pucks) drawPuck(ctx, puck);
      fx.draw(ctx);
      ctx.textAlign = 'center'; ctx.font = 'bold 18px monospace'; ctx.fillStyle = '#dfe8cf';
      const message = stage === 'roundOver' ? 'ROUND ' + round + ': YOU +' + roundResult.player + ' · CPU +' + roundResult.cpu :
        stage === 'sliding' ? (turn === 'player' ? 'YOUR' : 'CPU') + ' PUCK · LET IT GLIDE' :
        turn === 'cpu' ? 'CPU IS LINING UP A SHOT' : charging ? 'RELEASE TO SLIDE · ' + Math.round(power * 100) + '%' : 'YOUR TURN · HOLD SPACE, THEN RELEASE';
      ctx.fillText(message, W / 2, 369);
      const meterX = 102, meterY = 386, meterW = 516;
      ctx.fillStyle = '#273b31'; ctx.fillRect(meterX, meterY, meterW, 16);
      ctx.fillStyle = power > .83 ? '#ed9b85' : power > .68 ? '#ffd28a' : colors[turn];
      ctx.fillRect(meterX, meterY, meterW * power, 16);
      for (const zone of zones) {
        ctx.fillStyle = '#e7ebcb66'; ctx.fillRect(meterX + powerFor(zone + radius - origin.x) * meterW, meterY, 2, 16);
      }
      ctx.font = '11px monospace'; ctx.fillStyle = '#a1b19b'; ctx.textAlign = 'left'; ctx.fillText('SOFT', meterX, 417);
      ctx.textAlign = 'right'; ctx.fillText('STRONG', meterX + meterW, 417);
      ctx.textAlign = 'center'; ctx.fillText(stage === 'roundOver' ? (round >= rounds ? 'TIED! EXTRA ROUND COMING…' : 'NEXT ROUND COMING…') :
        '↑ ↓ AIM · MORE POWER = MORE RANDOM DIRECTION', W / 2, 439);
    },
    inspect() {
      return { type: 'shuffleboard', pucks: pucks.map(p => ({ ...p, points: pointsFor(p) })),
        used: { ...used }, totals: { ...totals }, tableScore: tableScore(), round, turn, stage,
        charging, power, aim, ended, timer, roundResult: roundResult && { ...roundResult },
        lastShot: lastShot && { ...lastShot }, table: { ...table }, zones: [...zones], radius, chargeSeconds, pucksPerRound, rounds };
    }
  };
}
