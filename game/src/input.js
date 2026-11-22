// Keyboard and mouse state. The game loop polls this once per frame;
// one-shot actions (coin toss, smoke, pause) are latched and consumed.

export class Input {
  constructor(canvas) {
    this.keys = new Set();
    this.moveX = 0;
    this.moveY = 0;
    this.sprint = false;
    this.crouch = false;
    this.coinTarget = null; // {x, y} in tile space, set by click / Q
    this.smokePressed = false;
    this.mouseTile = { x: 0, y: 0 };
    this._paused = false;
    this._anyKey = false;
    this._canvas = canvas;
    this._onKeyDown = (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) e.preventDefault();
      // Record both the key and the physical code, so a non-QWERTY layout
      // still drives the game (KeyW, ShiftLeft, KeyC, …).
      this.keys.add(e.key.toLowerCase());
      if (e.code) this.keys.add(e.code.toLowerCase());
      this._anyKey = true;
    };
    this._onKeyUp = (e) => {
      this.keys.delete(e.key.toLowerCase());
      if (e.code) this.keys.delete(e.code.toLowerCase());
    };
    this._onMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const sx = ((e.clientX - rect.left) / rect.width) * 1280;
      const sy = ((e.clientY - rect.top) / rect.height) * 800;
      this.mouseTile = { x: sx / 64, y: (sy - 64) / 64 };
    };
    this._onClick = () => {
      this.coinTarget = { ...this.mouseTile };
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    canvas.addEventListener('mousemove', this._onMouseMove);
    canvas.addEventListener('click', this._onClick);
  }

  poll() {
    const k = this.keys;
    let x = 0;
    let y = 0;
    if (k.has('a') || k.has('arrowleft')) x -= 1;
    if (k.has('d') || k.has('arrowright')) x += 1;
    if (k.has('w') || k.has('arrowup')) y -= 1;
    if (k.has('s') || k.has('arrowdown')) y += 1;
    this.moveX = x;
    this.moveY = y;
    this.sprint = k.has('shift');
    this.crouch = k.has('c') || k.has('control');
    if (k.has('q')) {
      this.coinTarget = { ...this.mouseTile };
      k.delete('q');
    }
    if (k.has('e')) {
      this.smokePressed = true;
      k.delete('e');
    }
    return {
      moveX: x,
      moveY: y,
      sprint: this.sprint,
      crouch: this.crouch,
      coinTarget: this.coinTarget,
      smoke: this.smokePressed,
    };
  }

  // Consume the one-shot flags after the world has read them.
  consume() {
    this.coinTarget = null;
    this.smokePressed = false;
  }

  pressed(key) {
    return this.keys.has(key.toLowerCase());
  }

  takeAnyKey() {
    const had = this._anyKey;
    this._anyKey = false;
    return had;
  }
}
