// input.js — keyboard + mouse for the heist. WASD or arrows to move, click to
// set a move target, keys 1/2/3 (or the side-panel buttons) to use tools,
// Space to grab loot, Enter to start / continue, R to retry after being caught.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.clickTarget = null; // {x, y} in playfield pixels, or null
    this.mouse = { x: 0, y: 0, inside: false };
    this.toolPressed = null; // 'smoke' | 'emp' | 'coin' consumed by the game
    this.actionPressed = false; // Space / Enter, consumed by the game
    this._canvas = canvas;
    this._onKeyDown = (e) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
      this.keys.add(k);
      if (k === '1') this.toolPressed = 'smoke';
      if (k === '2') this.toolPressed = 'emp';
      if (k === '3') this.toolPressed = 'coin';
      if (k === ' ' || k === 'enter') this.actionPressed = true;
    };
    this._onKeyUp = (e) => this.keys.delete(e.key.toLowerCase());
    this._onMouseMove = (e) => {
      const r = canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - r.left;
      this.mouse.y = e.clientY - r.top;
      this.mouse.inside = true;
    };
    this._onClick = (e) => {
      const r = canvas.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      this.clickTarget = { x, y, button: true };
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('click', this._onClick);
  }

  // Normalised WASD / arrow movement vector, or null when no key is held.
  moveVector() {
    let x = 0;
    let y = 0;
    if (this.keys.has('a') || this.keys.has('arrowleft')) x -= 1;
    if (this.keys.has('d') || this.keys.has('arrowright')) x += 1;
    if (this.keys.has('w') || this.keys.has('arrowup')) y -= 1;
    if (this.keys.has('s') || this.keys.has('arrowdown')) y += 1;
    if (x === 0 && y === 0) return null;
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  consumeTool() {
    const t = this.toolPressed;
    this.toolPressed = null;
    return t;
  }

  consumeAction() {
    const a = this.actionPressed;
    this.actionPressed = false;
    return a;
  }

  clearClickTarget() {
    this.clickTarget = null;
  }
}
