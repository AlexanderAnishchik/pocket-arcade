(function () {
  'use strict';

  const W = 720, H = 450;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const random = (a, b) => a + Math.random() * (b - a);
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

  function particles() {
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

  function snake(api) {
    const cell = 24, cols = 28, rows = 17, ox = 24, oy = 21;
    const vectors = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] };
    const fx = particles();
    let body, heading, queue, food, points, elapsed, ended, clock, previousHeld;
    function spawnFood() {
      const empty = [];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        if (!body.some(s => s.x === x && s.y === y)) empty.push({ x, y });
      }
      food = empty[Math.floor(Math.random() * empty.length)] || null;
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

  function pong(api) {
    const paddleW = 12, paddleH = 82, leftX = 36, rightX = W - 48, radius = 6;
    const fx = particles();
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
      if (Math.abs(ball.vy) < 30) ball.vy = (Math.random() < .5 ? -1 : 1) * 30;
      cpuOffset = random(-30, 30);
      fx.burst(ball.x, ball.y, palette.amber, 7); beep(api, direction > 0 ? 370 : 300, .035);
    }
    return {
      reset() {
        playerY = cpuY = (H - paddleH) / 2; playerPoints = cpuPoints = 0; target = null; ended = false;
        fx.clear(); newBall(Math.random() < .5 ? 1 : -1); updateScore();
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

  function breakout(api) {
    const radius = 7, paddleY = 395, paddleW = 104, paddleH = 12;
    const brickW = 58, brickH = 22, columns = 10, rows = 4, gap = 6, startX = 43, startY = 46;
    const colors = [palette.violet, '#9aabe8', '#80c5dd', palette.cyan];
    const fx = particles();
    let paddleX, ball, bricks, lives, points, serve, ended, target, trail;
    function newBall() {
      const vx = (Math.random() < .5 ? -1 : 1) * 140;
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

  window.RetroGames = { snake: { create: snake }, pong: { create: pong }, breakout: { create: breakout } };
})();
