// render.js — draws everything: the room, the sweeping vision cones, the
// thief, guards, cameras, loot and the exit, plus the HUD (alarm meter, loot,
// tools, objectives) and the title / caught / clear / victory screens.
// Original flat-vector style: deep navy rooms, gold loot, red danger.

import { COLORS, TILE, MAP_COLS, MAP_ROWS, PLAY_X, PLAY_Y, CANVAS_W, CANVAS_H, GUARD, CAMERA, TOOLS } from './config.js';
import { tileCenter } from './levels.js';

function conePath(ctx, x, y, angle, halfAngle, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.toolButtons = []; // {name, x, y, w, h} in canvas coords, for clicks
  }

  clear() {
    this.ctx.fillStyle = '#0d0f18';
    this.ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  }

  drawRoom(level, parsed) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(PLAY_X, PLAY_Y);
    // Floor checker.
    for (let r = 0; r < MAP_ROWS; r++) {
      for (let c = 0; c < MAP_COLS; c++) {
        ctx.fillStyle = (c + r) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
        ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      }
    }
    // Vents.
    for (const key of parsed.vents) {
      const [c, r] = key.split(',').map(Number);
      ctx.fillStyle = COLORS.vent;
      ctx.fillRect(c * TILE + 3, r * TILE + 3, TILE - 6, TILE - 6);
      ctx.strokeStyle = COLORS.ventEdge;
      ctx.lineWidth = 2;
      ctx.strokeRect(c * TILE + 5, r * TILE + 5, TILE - 10, TILE - 10);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        ctx.moveTo(c * TILE + 8, r * TILE + 12 + i * 8);
        ctx.lineTo(c * TILE + TILE - 8, r * TILE + 12 + i * 8);
      }
      ctx.stroke();
    }
    // Exit pad.
    if (parsed.exit) {
      const p = tileCenter(parsed.exit.col, parsed.exit.row);
      const pulse = 0.5 + 0.5 * Math.sin(performance.now() / 300);
      ctx.fillStyle = 'rgba(47, 174, 95, 0.35)';
      ctx.fillRect(parsed.exit.col * TILE, parsed.exit.row * TILE, TILE, TILE);
      ctx.strokeStyle = COLORS.exitGlow;
      ctx.lineWidth = 2 + pulse;
      ctx.strokeRect(parsed.exit.col * TILE + 3, parsed.exit.row * TILE + 3, TILE - 6, TILE - 6);
      ctx.fillStyle = COLORS.exitGlow;
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EXIT', p.x, p.y + 4);
    }
    // Cover: crates and glass display cases.
    for (const key of parsed.cover) {
      const [c, r] = key.split(',').map(Number);
      const isCase = level.map[r][c] === 'D';
      ctx.fillStyle = isCase ? '#3d5a73' : COLORS.crate;
      ctx.fillRect(c * TILE + 2, r * TILE + 2, TILE - 4, TILE - 4);
      ctx.fillStyle = isCase ? 'rgba(180,220,255,0.35)' : COLORS.crateTop;
      ctx.fillRect(c * TILE + 2, r * TILE + 2, TILE - 4, 10);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(c * TILE + 2, r * TILE + 2, TILE - 4, TILE - 4);
    }
    // Walls.
    for (const key of parsed.walls) {
      const [c, r] = key.split(',').map(Number);
      ctx.fillStyle = COLORS.wall;
      ctx.fillRect(c * TILE, r * TILE, TILE, TILE);
      ctx.fillStyle = COLORS.wallTop;
      ctx.fillRect(c * TILE, r * TILE, TILE, 6);
    }
    ctx.restore();
  }

  drawCones(guards, cameras) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(PLAY_X, PLAY_Y);
    for (const cam of cameras) {
      if (cam.disabled) continue;
      ctx.fillStyle = cam.seeing ? 'rgba(255, 80, 60, 0.30)' : COLORS.coneCam;
      conePath(ctx, cam.x, cam.y, cam.angle, CAMERA.halfAngle, CAMERA.range);
      ctx.fill();
    }
    for (const g of guards) {
      if (g.blinded) continue;
      const hot = g.state === 'chase' || g.state === 'warn' || g.suspicion > 0.4;
      ctx.fillStyle = hot ? COLORS.coneHot : COLORS.cone;
      conePath(ctx, g.pos.x, g.pos.y, g.facing, GUARD.visionHalfAngle, GUARD.visionRange);
      ctx.fill();
    }
    ctx.restore();
  }

  drawLoot(parsed, targetName) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(PLAY_X, PLAY_Y);
    const bob = Math.sin(performance.now() / 280) * 2;
    for (const item of parsed.loot) {
      if (item.taken) continue;
      const p = tileCenter(item.col, item.row);
      ctx.fillStyle = COLORS.lootSmall;
      ctx.beginPath();
      ctx.arc(p.x, p.y + bob, item.kind === 'bonus' ? 10 : 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#7a5b00';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('$', p.x, p.y + bob + 4);
    }
    if (parsed.target && !parsed.target.taken) {
      const p = tileCenter(parsed.target.col, parsed.target.row);
      const glow = 0.5 + 0.5 * Math.sin(performance.now() / 240);
      ctx.fillStyle = `rgba(255, 157, 46, ${0.25 + glow * 0.25})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 24 + glow * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.lootMain;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - 13);
      ctx.lineTo(p.x + 10, p.y);
      ctx.lineTo(p.x, p.y + 13);
      ctx.lineTo(p.x - 10, p.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(targetName.toUpperCase(), p.x, p.y - 26);
    }
    ctx.restore();
  }

  drawSmoke(thief) {
    if (!thief.smoking || !thief.smokeAt) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(PLAY_X, PLAY_Y);
    const grad = ctx.createRadialGradient(thief.smokeAt.x, thief.smokeAt.y, 10, thief.smokeAt.x, thief.smokeAt.y, 130);
    grad.addColorStop(0, 'rgba(200, 200, 210, 0.55)');
    grad.addColorStop(1, 'rgba(200, 200, 210, 0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(thief.smokeAt.x, thief.smokeAt.y, 130, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCameras(cameras) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(PLAY_X, PLAY_Y);
    for (const cam of cameras) {
      ctx.fillStyle = cam.disabled ? '#556' : COLORS.camera;
      ctx.beginPath();
      ctx.arc(cam.x, cam.y, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = cam.seeing ? '#ff5040' : '#334';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cam.x, cam.y);
      ctx.lineTo(cam.x + Math.cos(cam.angle) * 16, cam.y + Math.sin(cam.angle) * 16);
      ctx.stroke();
      if (cam.disabled) {
        ctx.fillStyle = '#ff5040';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('×', cam.x, cam.y - 12);
      }
    }
    ctx.restore();
  }

  drawGuards(guards) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(PLAY_X, PLAY_Y);
    for (const g of guards) {
      // Body.
      ctx.fillStyle = g.blinded ? '#8a8a9a' : COLORS.guard;
      ctx.beginPath();
      ctx.arc(g.pos.x, g.pos.y, GUARD.radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = g.blinded ? '#666' : COLORS.guardDark;
      ctx.beginPath();
      ctx.arc(g.pos.x, g.pos.y, 7, 0, Math.PI * 2);
      ctx.fill();
      // Facing tick.
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.pos.x, g.pos.y);
      ctx.lineTo(g.pos.x + Math.cos(g.facing) * 16, g.pos.y + Math.sin(g.facing) * 16);
      ctx.stroke();
      // Suspicion ring + "!" warning.
      if (g.suspicion > 0.05 && g.state !== 'chase') {
        ctx.strokeStyle = g.suspicion > 0.6 ? '#ff5040' : '#ffd65a';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(g.pos.x, g.pos.y, 19, -Math.PI / 2, -Math.PI / 2 + g.suspicion * Math.PI * 2);
        ctx.stroke();
      }
      if (g.state === 'warn' || g.state === 'chase') {
        ctx.fillStyle = '#ff5040';
        ctx.font = 'bold 22px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('!', g.pos.x, g.pos.y - 22);
      }
      if (g.state === 'chase') {
        ctx.fillStyle = '#ff5040';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText('CHASING', g.pos.x, g.pos.y - 36);
      }
    }
    ctx.restore();
  }

  drawThief(thief) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(PLAY_X, PLAY_Y);
    if (thief.inVent) {
      ctx.globalAlpha = 0.45;
    }
    ctx.fillStyle = COLORS.thiefCoat;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, PLAYER_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.thief;
    ctx.beginPath();
    ctx.arc(thief.x, thief.y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.fillRect(thief.x - 6, thief.y - 2, 12, 3);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(thief.x, thief.y);
    ctx.lineTo(thief.x + Math.cos(thief.facing) * 17, thief.y + Math.sin(thief.facing) * 17);
    ctx.stroke();
    ctx.restore();
    if (thief.inVent) {
      ctx.fillStyle = '#3fa7a0';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('HIDDEN IN VENT', PLAY_X + thief.x, PLAY_Y + thief.y - 24);
    }
  }

  drawHud(game) {
    const ctx = this.ctx;
    const alarm = game.alarm.value;
    ctx.fillStyle = COLORS.hud;
    ctx.fillRect(0, 0, CANVAS_W, 76);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('MIDNIGHT GALLERY', 20, 30);
    ctx.font = '13px sans-serif';
    ctx.fillStyle = '#9aa3c0';
    ctx.fillText(`Room ${game.levelIndex + 1}/3 · ${game.level.name} — ${game.level.targetName}`, 20, 52);
    // Alarm meter.
    const ax = 480;
    const aw = 300;
    ctx.fillStyle = '#9aa3c0';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('ALARM', ax, 26);
    ctx.fillStyle = '#2a3048';
    ctx.fillRect(ax, 34, aw, 18);
    const alarmColor = alarm < 40 ? COLORS.alarmLow : alarm < 75 ? COLORS.alarmMid : COLORS.alarmHigh;
    ctx.fillStyle = alarmColor;
    ctx.fillRect(ax, 34, (aw * alarm) / 100, 18);
    ctx.strokeStyle = '#556';
    ctx.strokeRect(ax, 34, aw, 18);
    ctx.fillStyle = COLORS.hudText;
    ctx.fillText(`${Math.round(alarm)}%${game.alarm.lockdown ? ' — LOCKDOWN!' : ''}`, ax + aw + 10, 49);
    // Loot.
    ctx.fillStyle = COLORS.lootSmall;
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText(`$${game.thief.loot}`, 880, 32);
    ctx.fillStyle = '#9aa3c0';
    ctx.font = '12px sans-serif';
    ctx.fillText(game.targetTaken ? 'GET TO THE EXIT!' : `Steal: ${game.level.targetName}`, 880, 52);
    // Timer.
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(game.formatTime(), CANVAS_W - 20, 32);
    ctx.fillStyle = '#9aa3c0';
    ctx.font = '12px sans-serif';
    ctx.fillText('WASD move · click to go · Space grab', CANVAS_W - 20, 52);
    ctx.textAlign = 'left';
    this.drawSidePanel(game);
  }

  drawSidePanel(game) {
    const ctx = this.ctx;
    const px = PLAY_X + MAP_COLS * TILE + 16;
    const py = PLAY_Y;
    const pw = CANVAS_W - px - 16;
    ctx.fillStyle = COLORS.panel;
    ctx.fillRect(px, py, pw, MAP_ROWS * TILE);
    ctx.strokeStyle = COLORS.panelEdge;
    ctx.strokeRect(px, py, pw, MAP_ROWS * TILE);
    ctx.fillStyle = COLORS.hudText;
    ctx.font = 'bold 15px sans-serif';
    ctx.fillText('TOOLS', px + 14, py + 26);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#9aa3c0';
    ctx.fillText('Loot buys tools.', px + 14, py + 46);
    ctx.fillText('Click a tool or', px + 14, py + 62);
    ctx.fillText('press 1 / 2 / 3.', px + 14, py + 78);
    this.toolButtons = [];
    let y = py + 96;
    for (const [name, tool] of Object.entries(TOOLS)) {
      const affordable = game.thief.loot >= tool.cost;
      ctx.fillStyle = affordable ? '#2b3a5e' : '#222838';
      ctx.fillRect(px + 12, y, pw - 24, 58);
      ctx.strokeStyle = affordable ? '#4a6aa8' : '#333a52';
      ctx.strokeRect(px + 12, y, pw - 24, 58);
      ctx.fillStyle = affordable ? '#fff' : '#777';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(`[${tool.key}] ${tool.name}`, px + 20, y + 20);
      ctx.font = '12px sans-serif';
      ctx.fillStyle = affordable ? COLORS.lootSmall : '#777';
      ctx.fillText(`$${tool.cost}`, px + 20, y + 40);
      this.toolButtons.push({ name, x: px + 12, y, w: pw - 24, h: 58 });
      y += 68;
    }
    // Objective box.
    const oy = y + 8;
    ctx.fillStyle = '#1a2418';
    ctx.fillRect(px + 12, oy, pw - 24, 118);
    ctx.strokeStyle = '#3a5a34';
    ctx.strokeRect(px + 12, oy, pw - 24, 118);
    ctx.fillStyle = '#bfe8b0';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('PLAN', px + 20, oy + 20);
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#d8e8d0';
    const lines = game.targetTaken
      ? ['1. Target stolen ✓', '2. Reach the green', '   EXIT pad', '3. Do not get caught']
      : [`1. Steal the`, `   ${game.level.targetName}`, '2. Grab side loot', '3. Reach the EXIT'];
    lines.forEach((line, i) => ctx.fillText(line, px + 20, oy + 42 + i * 17));
    // Routes hint.
    const ry = oy + 132;
    ctx.fillStyle = '#9aa3c0';
    ctx.font = '12px sans-serif';
    ctx.fillText('Routes: main hall,', px + 14, ry);
    ctx.fillText('side corridors,', px + 14, ry + 16);
    ctx.fillText('and the teal vents', px + 14, ry + 32);
    ctx.fillText('(vents hide you).', px + 14, ry + 48);
  }

  // Full-screen overlay screens.
  overlay(title, lines, hint, accent = '#e8e6f0') {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(8, 10, 18, 0.82)';
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.textAlign = 'center';
    ctx.fillStyle = accent;
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(title, CANVAS_W / 2, 300);
    ctx.fillStyle = '#d8dce8';
    ctx.font = '17px sans-serif';
    lines.forEach((line, i) => ctx.fillText(line, CANVAS_W / 2, 350 + i * 28));
    ctx.fillStyle = '#ffd34d';
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(hint, CANVAS_W / 2, 350 + lines.length * 28 + 26);
    ctx.textAlign = 'left';
  }

  drawTitle(game) {
    this.overlay(
      'MIDNIGHT GALLERY',
      [
        'You are the thief. Three rooms, three treasures, one getaway.',
        'Guards sweep yellow cones — cross them unseen. Cameras sweep blue.',
        'Vents hide you. Smoke, EMP and coins cost loot — spend it wisely.',
        `${game.level.name}: steal the ${game.level.targetName}, then reach the green EXIT.`,
      ],
      'Press ENTER or click to start the heist',
      '#ffd34d',
    );
  }

  drawCaught(game) {
    this.overlay(
      'CAUGHT!',
      [
        `A guard grabbed you in ${game.level.name}.`,
        `You kept $${game.thief.loot} of your loot — the alarm stays warm at ${Math.round(game.alarm.value)}%.`,
        'Watch the cones. Wait for the patrol to turn. Use the vents.',
      ],
      'Press R or ENTER to try the room again',
      '#ff5040',
    );
  }

  drawLevelClear(game) {
    this.overlay(
      'CLEAN GETAWAY!',
      [
        `The ${game.level.targetName} is yours. Loot so far: $${game.thief.loot}.`,
        game.levelIndex + 1 < 3 ? `Next: ${game.levels[game.levelIndex + 1].name}.` : '',
      ].filter(Boolean),
      'Press ENTER for the next room',
      '#7dffb0',
    );
  }

  drawVictory(game) {
    this.overlay(
      'THE AURELIA HEIST',
      [
        `All three treasures stolen. Total loot: $${game.thief.loot}.`,
        `Finished in ${game.formatTime()} with the alarm at ${Math.round(game.alarm.value)}%.`,
        game.thief.loot >= 400 ? 'Legendary crew. The gallery never saw you coming.' : 'A clean job — the crew eats tonight.',
      ],
      'Press ENTER to play again',
      '#ffd34d',
    );
  }
}

const PLAYER_RADIUS = 13;
