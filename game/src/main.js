// main.js — Midnight Gallery: a top-down stealth heist in three rooms.
// Owns the game loop, the state machine (title / playing / caught / clear /
// victory), level flow, detection, loot, tools and the getaway. Rendering,
// guard AI, cameras, the thief and sound live in their own files.

import { CANVAS_W, CANVAS_H, TILE, PLAY_X, PLAY_Y, MAP_COLS, MAP_ROWS } from './config.js';
import { LEVELS, parseLevel, tileCenter, tileKey } from './levels.js';
import { Input } from './input.js';
import { Guard } from './guard.js';
import { Camera, Alarm } from './security.js';
import { Thief } from './player.js';
import { Renderer } from './render.js';
import { SoundFX } from './audio.js';
import { applyShot } from './shots.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.input = new Input(canvas);
    this.renderer = new Renderer(canvas);
    this.sfx = new SoundFX();
    this.levels = LEVELS;
    this.levelIndex = 0;
    this.level = LEVELS[0];
    this.state = 'title'; // title | playing | caught | clear | victory
    this.thief = null;
    this.guards = [];
    this.cameras = [];
    this.parsed = null;
    this.alarm = new Alarm(0);
    this.targetTaken = false;
    this.elapsed = 0;
    this.lastTime = 0;
    this.alarmBeepedAt = 0;
    this._seenSpotted = false;
    this.loadLevel(0);
    const params = new URLSearchParams(window.location.search);
    const shot = params.get('shot');
    if (shot) applyShot(this, shot);
  }

  loadLevel(index) {
    this.levelIndex = index;
    this.level = LEVELS[index];
    this.parsed = parseLevel(this.level);
    const start = this.parsed.start;
    if (!this.thief) this.thief = new Thief(start);
    else {
      const p = tileCenter(start.col, start.row);
      this.thief.x = p.x;
      this.thief.y = p.y;
      this.thief.inVent = false;
    }
    this.guards = this.level.guards.map((g) => new Guard(g));
    this.cameras = this.level.cameras.map((c) => new Camera(c));
    this.alarm.reset(this.level.alarmStart);
    this.targetTaken = false;
    this._seenSpotted = false;
  }

  isSolid(col, row) {
    if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return true;
    const key = tileKey(col, row);
    return this.parsed.walls.has(key) || this.parsed.cover.has(key);
  }

  isOpaque(col, row) {
    if (col < 0 || row < 0 || col >= MAP_COLS || row >= MAP_ROWS) return true;
    const key = tileKey(col, row);
    return this.parsed.walls.has(key) || this.parsed.cover.has(key);
  }

  formatTime() {
    const s = Math.floor(this.elapsed);
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  start() {
    const loop = (time) => {
      const dt = Math.min(0.05, (time - this.lastTime) / 1000 || 0.016);
      this.lastTime = time;
      this.update(dt, time / 1000);
      this.render();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  update(dt, now) {
    if (this.state === 'title') {
      this.updateAmbient(dt, now);
      if (this.input.consumeAction() || this.input.clickTarget) {
        this.input.clearClickTarget();
        this.state = 'playing';
        this.sfx.ensure();
      }
      return;
    }
    if (this.state === 'caught') {
      if (this.input.keys.has('r') || this.input.consumeAction()) {
        this.input.keys.delete('r');
        this.loadLevel(this.levelIndex);
        this.state = 'playing';
      }
      return;
    }
    if (this.state === 'clear') {
      if (this.input.consumeAction()) {
        if (this.levelIndex + 1 < this.levels.length) {
          this.loadLevel(this.levelIndex + 1);
          this.state = 'playing';
        } else {
          this.state = 'victory';
        }
      }
      return;
    }
    if (this.state === 'victory') {
      if (this.input.consumeAction()) {
        this.thief.loot = 0;
        this.elapsed = 0;
        this.loadLevel(0);
        this.state = 'title';
      }
      return;
    }
    if (this.state !== 'playing') return;
    this.elapsed += dt;

    // --- Thief movement: keys first, click-to-move otherwise.
    const vec = this.input.moveVector();
    if (vec) {
      this.input.clearClickTarget();
      this.thief.move(vec.x, vec.y, dt, (c, r) => this.isSolid(c, r));
    } else if (this.input.clickTarget) {
      const target = this.input.clickTarget;
      // Tool buttons live in the side panel: clicking one uses that tool.
      const button = this.renderer.toolButtons.find(
        (b) => target.x >= b.x && target.x <= b.x + b.w && target.y >= b.y && target.y <= b.y + b.h,
      );
      if (button) {
        this.input.toolPressed = button.name;
        this.input.clearClickTarget();
      } else {
        const tx = target.x - PLAY_X;
        const ty = target.y - PLAY_Y;
        const dx = tx - this.thief.x;
        const dy = ty - this.thief.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 6) {
          this.thief.move(dx / dist, dy / dist, dt, (c, r) => this.isSolid(c, r));
        } else {
          this.input.clearClickTarget();
        }
      }
    }
    this.thief.updateVent(this.parsed.vents);

    // --- Tools.
    const tool = this.input.consumeTool();
    if (tool) {
      const result = this.thief.useTool(tool, this.guards, this.cameras, now);
      if (result.ok) this.sfx.pickup();
    }

    // --- Loot: Space grabs the nearest loot, or walk over small loot.
    const near = this.thief.nearestLoot(this.parsed.loot, this.parsed.target);
    if (near && this.input.consumeAction()) this.grabLoot(near);
    for (const item of this.parsed.loot) {
      if (item.taken) continue;
      const p = tileCenter(item.col, item.row);
      if (Math.hypot(p.x - this.thief.x, p.y - this.thief.y) < 24) {
        this.grabLoot({ kind: 'loot', item });
      }
    }

    // --- Guards and cameras.
    const inVent = this.thief.inVent;
    let anyGuardSees = false;
    for (const g of this.guards) {
      g.update(dt, this.thief, (c, r) => this.isOpaque(c, r), inVent, now);
      if (g.state === 'warn' && !this._seenSpotted) {
        this._seenSpotted = true;
        this.sfx.spotted();
      }
      if (g.state === 'patrol') this._seenSpotted = false;
      if (g.canSee(this.thief.x, this.thief.y, (c, r) => this.isOpaque(c, r), inVent)) anyGuardSees = true;
      if (g.catches(this.thief)) {
        this.state = 'caught';
        this.sfx.caught();
        return;
      }
    }
    let anyCameraSees = false;
    for (const cam of this.cameras) {
      cam.update(dt, now, this.thief, (c, r) => this.isOpaque(c, r), inVent);
      if (cam.seeing) anyCameraSees = true;
    }
    this.alarm.update(dt, anyGuardSees, anyCameraSees);
    if (this.alarm.value > 60 && now - this.alarmBeepedAt > 1.2) {
      this.alarmBeepedAt = now;
      this.sfx.alarmTick();
    }
    // Lockdown: every guard converges on the thief.
    if (this.alarm.lockdown) {
      for (const g of this.guards) {
        if (g.state === 'patrol' || g.state === 'return') {
          g.state = 'chase';
          g.lastSeen = { x: this.thief.x, y: this.thief.y };
        }
      }
    }

    // --- Exit: open once the main target is stolen.
    if (this.targetTaken && this.parsed.exit) {
      const p = tileCenter(this.parsed.exit.col, this.parsed.exit.row);
      if (Math.hypot(p.x - this.thief.x, p.y - this.thief.y) < 30) {
        this.sfx.escape();
        this.state = 'clear';
      }
    }
  }

  // Guards keep patrolling behind the title screen so it feels alive.
  updateAmbient(dt, now) {
    for (const g of this.guards) {
      g.update(dt, { x: -9999, y: -9999 }, (c, r) => this.isOpaque(c, r), false, now);
    }
    for (const cam of this.cameras) {
      cam.update(dt, now, { x: -9999, y: -9999 }, (c, r) => this.isOpaque(c, r), false);
    }
  }

  grabLoot(near) {
    if (near.kind === 'loot') {
      near.item.taken = true;
      this.thief.loot += near.item.value;
      this.sfx.pickup();
    } else if (near.kind === 'target') {
      near.item.taken = true;
      this.targetTaken = true;
      this.thief.loot += 150;
      this.sfx.target();
    }
  }

  render() {
    const r = this.renderer;
    r.clear();
    r.drawRoom(this.level, this.parsed);
    r.drawCones(this.guards, this.cameras);
    r.drawLoot(this.parsed, this.level.targetName);
    r.drawSmoke(this.thief);
    r.drawCameras(this.cameras);
    r.drawGuards(this.guards);
    r.drawThief(this.thief);
    r.drawHud(this);
    if (this.state === 'title') r.drawTitle(this);
    else if (this.state === 'caught') r.drawCaught(this);
    else if (this.state === 'clear') r.drawLevelClear(this);
    else if (this.state === 'victory') r.drawVictory(this);
    // "Press Space to grab" hint, drawn in the empty strip below the room
    // so it never overlaps the loot label or a vision cone.
    if (this.state === 'playing') {
      const near = this.thief.nearestLoot(this.parsed.loot, this.parsed.target);
      if (near) {
        const ctx = r.ctx;
        ctx.fillStyle = '#ffd34d';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(
          near.kind === 'target' ? 'SPACE — steal the target!' : 'SPACE — grab the loot!',
          CANVAS_W / 2,
          CANVAS_H - 22,
        );
        ctx.textAlign = 'left';
      }
    }
  }
}

const canvas = document.getElementById('game');
const game = new Game(canvas);
window.__game = game;
game.start();
