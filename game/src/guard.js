// guard.js — the patrol guard: walks its waypoints, sweeps a vision cone, and
// gets suspicious when the thief crosses it. A fair "caught" moment: the guard
// flashes "!" for a grace period before giving chase, and loses the trail if
// it cannot see you for a few seconds.

import { GUARD, TILE } from './config.js';
import { tileCenter } from './levels.js';

export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Line of sight on the tile grid: sample the segment; walls and cover block it.
export function hasLineOfSight(x0, y0, x1, y1, isOpaque) {
  const dist = Math.hypot(x1 - x0, y1 - y0);
  const steps = Math.max(1, Math.ceil(dist / 8));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x0 + (x1 - x0) * t;
    const py = y0 + (y1 - y0) * t;
    const col = Math.floor(px / TILE);
    const row = Math.floor(py / TILE);
    if (isOpaque(col, row)) return false;
  }
  return true;
}

export class Guard {
  constructor(def) {
    this.waypoints = def.waypoints.map(([c, r]) => tileCenter(c, r));
    this.pause = def.pause ?? 0.8;
    this.pos = { ...this.waypoints[0] };
    this.wpIndex = 1;
    this.waitTimer = 0;
    this.facing = 0;
    this.state = 'patrol'; // patrol | warn | chase | return
    this.suspicion = 0;
    this.loseSightTimer = 0;
    this.warnTimer = 0;
    this.lastSeen = null;
    this.blindedUntil = 0;
    this.distractedUntil = 0;
    this.distractPoint = null;
  }

  get blinded() {
    return performance.now() / 1000 < this.blindedUntil;
  }

  get distracted() {
    return performance.now() / 1000 < this.distractedUntil;
  }

  // Can this guard see the point? Range, cone angle, line of sight, vents hide.
  canSee(px, py, isOpaque, inVent) {
    if (this.blinded || inVent) return false;
    const dx = px - this.pos.x;
    const dy = py - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > GUARD.visionRange) return false;
    if (dist > 26 && Math.abs(angleDiff(Math.atan2(dy, dx), this.facing)) > GUARD.visionHalfAngle) return false;
    return hasLineOfSight(this.pos.x, this.pos.y, px, py, isOpaque);
  }

  update(dt, player, isOpaque, inVent, now) {
    const sees = this.canSee(player.x, player.y, isOpaque, inVent);
    if (sees) {
      this.suspicion = Math.min(1, this.suspicion + GUARD.suspicionPerSecond * dt);
      this.lastSeen = { x: player.x, y: player.y };
      this.loseSightTimer = 0;
    } else {
      this.suspicion = Math.max(0, this.suspicion - GUARD.suspicionDecay * dt);
      this.loseSightTimer += dt;
    }

    if (this.state === 'patrol' && this.suspicion >= 1) {
      this.state = 'warn';
      this.warnTimer = GUARD.spotGraceSeconds;
    }
    if (this.state === 'warn') {
      this.warnTimer -= dt;
      if (sees) this.facing = Math.atan2(player.y - this.pos.y, player.x - this.pos.x);
      if (this.warnTimer <= 0) this.state = 'chase';
      if (this.suspicion <= 0.2) this.state = 'patrol';
    }
    if (this.state === 'chase') {
      if (this.loseSightTimer > GUARD.chaseGiveUpSeconds) {
        this.state = 'return';
        this.suspicion = 0;
      }
    }

    if (this.distracted && this.distractPoint && this.state !== 'chase') {
      this.moveToward(this.distractPoint, GUARD.patrolSpeed, dt);
      this.facing = Math.atan2(this.distractPoint.y - this.pos.y, this.distractPoint.x - this.pos.x);
      return;
    }

    if (this.state === 'chase' && this.lastSeen) {
      const arrived = this.moveToward(this.lastSeen, GUARD.chaseSpeed, dt);
      this.facing = Math.atan2(this.lastSeen.y - this.pos.y, this.lastSeen.x - this.pos.x);
      if (arrived) this.lastSeen = null;
      return;
    }
    if (this.state === 'return') {
      const target = this.waypoints[this.wpIndex];
      if (this.moveToward(target, GUARD.patrolSpeed, dt)) this.state = 'patrol';
      return;
    }
    // Patrol: walk waypoints, pausing at each one and looking around.
    if (this.waitTimer > 0) {
      this.waitTimer -= dt;
      this.facing += Math.sin(now * 1.4) * dt * 0.5;
      return;
    }
    const target = this.waypoints[this.wpIndex];
    const arrived = this.moveToward(target, GUARD.patrolSpeed, dt);
    this.facing = Math.atan2(target.y - this.pos.y, target.x - this.pos.x);
    if (arrived) {
      this.wpIndex = (this.wpIndex + 1) % this.waypoints.length;
      this.waitTimer = this.pause;
    }
  }

  moveToward(target, speed, dt) {
    const dx = target.x - this.pos.x;
    const dy = target.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * dt;
    if (dist <= Math.max(step, 3)) {
      this.pos.x = target.x;
      this.pos.y = target.y;
      return true;
    }
    this.pos.x += (dx / dist) * step;
    this.pos.y += (dy / dist) * step;
    return false;
  }

  // The guard catches the thief by touch (only while chasing or warning).
  catches(player) {
    if (this.state !== 'chase' && this.state !== 'warn') return false;
    return Math.hypot(player.x - this.pos.x, player.y - this.pos.y) < GUARD.radius + 13;
  }
}
