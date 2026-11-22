// security.js — wall-mounted cameras that sweep their cone, and the alarm
// meter every camera and guard feeds. At 100 the building locks down: every
// guard converges on the thief, and the only way out is the exit.

import { CAMERA, ALARM, TILE } from './config.js';
import { angleDiff, hasLineOfSight } from './guard.js';
import { tileCenter } from './levels.js';

export class Camera {
  constructor(def) {
    const p = tileCenter(def.tile[0], def.tile[1]);
    this.x = p.x;
    this.y = p.y;
    this.baseAngle = def.baseAngle;
    this.sweep = def.sweep;
    this.phase = Math.random() * Math.PI * 2;
    this.angle = def.baseAngle;
    this.disabledUntil = 0;
    this.seeing = false;
  }

  get disabled() {
    return performance.now() / 1000 < this.disabledUntil;
  }

  update(dt, now, player, isOpaque, inVent) {
    if (this.disabled) {
      this.seeing = false;
      return;
    }
    this.angle = this.baseAngle + Math.sin(now * CAMERA.sweepSpeed + this.phase) * this.sweep;
    this.seeing = this.canSee(player.x, player.y, isOpaque, inVent);
  }

  canSee(px, py, isOpaque, inVent) {
    if (this.disabled || inVent) return false;
    const dx = px - this.x;
    const dy = py - this.y;
    const dist = Math.hypot(dx, dy);
    if (dist > CAMERA.range) return false;
    if (Math.abs(angleDiff(Math.atan2(dy, dx), this.angle)) > CAMERA.halfAngle) return false;
    return hasLineOfSight(this.x, this.y, px, py, isOpaque);
  }
}

export class Alarm {
  constructor(startValue = 0) {
    this.value = startValue;
    this.lockdown = startValue >= ALARM.lockdownAt;
  }

  add(amount) {
    this.value = Math.min(ALARM.lockdownAt, this.value + amount);
    if (this.value >= ALARM.lockdownAt) this.lockdown = true;
  }

  update(dt, anyGuardSees, anyCameraSees) {
    if (anyGuardSees) this.add(ALARM.guardSeenPerSecond * dt);
    if (anyCameraSees) this.add(CAMERA.alarmPerSecond * dt);
    if (!anyGuardSees && !anyCameraSees) {
      this.value = Math.max(0, this.value - ALARM.decayPerSecond * dt);
    }
    if (this.value >= ALARM.lockdownAt) this.lockdown = true;
  }

  reset(startValue = 0) {
    this.value = startValue;
    this.lockdown = false;
  }
}
