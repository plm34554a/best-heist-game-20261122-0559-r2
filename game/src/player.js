// player.js — the thief: a cat-burglar in a dark coat. Moves with WASD/arrows
// or click-to-move, crawls through vents unseen, grabs loot, and spends loot
// on tools: smoke to blind guards, EMP to kill cameras, a coin toss to pull a
// guard away from a route.

import { PLAYER, TILE, TOOLS } from './config.js';
import { tileCenter, tileKey } from './levels.js';

export class Thief {
  constructor(start) {
    const p = tileCenter(start.col, start.row);
    this.x = p.x;
    this.y = p.y;
    this.facing = 0;
    this.loot = 0;
    this.moving = false;
    this.inVent = false;
    this.smokeUntil = 0;
    this.smokeAt = null;
  }

  get smoking() {
    return performance.now() / 1000 < this.smokeUntil;
  }

  // Circle-vs-tile collision: walls and cover block, vents and floor do not.
  isBlocked(col, row, isSolid) {
    return isSolid(col, row);
  }

  move(dx, dy, dt, isSolid) {
    const speed = this.inVent ? PLAYER.ventSpeed : PLAYER.speed;
    const nx = this.x + dx * speed * dt;
    const ny = this.y + dy * speed * dt;
    this.tryStep(nx, this.y, isSolid);
    this.tryStep(this.x, ny, isSolid);
    if (dx !== 0 || dy !== 0) this.facing = Math.atan2(dy, dx);
    this.moving = dx !== 0 || dy !== 0;
  }

  tryStep(nx, ny, isSolid) {
    const r = PLAYER.radius;
    const corners = [
      [nx - r, ny - r],
      [nx + r, ny - r],
      [nx - r, ny + r],
      [nx + r, ny + r],
    ];
    for (const [px, py] of corners) {
      const col = Math.floor(px / TILE);
      const row = Math.floor(py / TILE);
      if (isSolid(col, row)) return; // blocked: do not move on this axis
    }
    this.x = nx;
    this.y = ny;
  }

  updateVent(vents) {
    const col = Math.floor(this.x / TILE);
    const row = Math.floor(this.y / TILE);
    this.inVent = vents.has(tileKey(col, row));
  }

  // Nearest loot within grab range (small loot, bonus loot or the main target).
  nearestLoot(loot, target) {
    let best = null;
    let bestDist = PLAYER.grabRange + 14;
    for (const item of loot) {
      if (item.taken) continue;
      const p = tileCenter(item.col, item.row);
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < bestDist) {
        bestDist = d;
        best = { kind: 'loot', item, x: p.x, y: p.y };
      }
    }
    if (target && !target.taken) {
      const p = tileCenter(target.col, target.row);
      const d = Math.hypot(p.x - this.x, p.y - this.y);
      if (d < bestDist) best = { kind: 'target', item: target, x: p.x, y: p.y };
    }
    return best;
  }

  useTool(name, guards, cameras, now) {
    const tool = TOOLS[name];
    if (!tool) return { ok: false, reason: 'no such tool' };
    if (this.loot < tool.cost) return { ok: false, reason: 'not enough loot' };
    this.loot -= tool.cost;
    if (name === 'smoke') {
      this.smokeUntil = now + tool.duration;
      this.smokeAt = { x: this.x, y: this.y };
      for (const g of guards) {
        if (Math.hypot(g.pos.x - this.x, g.pos.y - this.y) < tool.radius) {
          g.blindedUntil = now + tool.duration;
          g.suspicion = 0;
          if (g.state === 'chase' || g.state === 'warn') g.state = 'return';
        }
      }
    } else if (name === 'emp') {
      for (const c of cameras) c.disabledUntil = now + tool.duration;
    } else if (name === 'coin') {
      let nearest = null;
      let nearestDist = tool.radius;
      for (const g of guards) {
        const d = Math.hypot(g.pos.x - this.x, g.pos.y - this.y);
        if (d < nearestDist) {
          nearestDist = d;
          nearest = g;
        }
      }
      if (nearest) {
        // Toss the coin past the guard: it walks to where the coin lands.
        const dx = nearest.pos.x - this.x;
        const dy = nearest.pos.y - this.y;
        const len = Math.hypot(dx, dy) || 1;
        nearest.distractPoint = { x: nearest.pos.x + (dx / len) * 90, y: nearest.pos.y + (dy / len) * 90 };
        nearest.distractedUntil = now + 5;
        nearest.suspicion = Math.max(0, nearest.suspicion - 0.5);
      }
    }
    return { ok: true, tool };
  }
}
