/** Time-based presentation state, independent of rendering and display refresh rate. */
export class SooVersMotion {
  elapsed = 0;
  time = 0;
  expanded = 0;
  expandTarget = false;
  playing = true;
  cinematic = true;
  showcase = true;
  constructor(public reduced = false) {
    if (reduced) { this.elapsed = 9; this.cinematic = false; this.playing = false; }
  }
  get assembled() { return this.elapsed >= 5.4; }
  advance(dt: number) {
    const step = Math.max(0, Math.min(dt, .05));
    if (this.playing) { this.elapsed = Math.min(9, this.elapsed + step); this.time += step; }
    if (this.elapsed >= 9) this.cinematic = false;
    const target = this.expandTarget && this.showcase ? 1 : 0;
    this.expanded = this.reduced ? target : this.expanded + (target - this.expanded) * (1 - Math.exp(-step * 4));
  }
  reveal(index: number) {
    const p = Math.max(0, Math.min(1, (this.elapsed - index * .31) / 2.8));
    return p * p * (3 - 2 * p);
  }
  interrupt() { this.cinematic = false; }
  replay() {
    this.elapsed = this.reduced ? 9 : 0; this.time = 0; this.expandTarget = false;
    this.expanded = 0; this.cinematic = !this.reduced; this.playing = !this.reduced;
  }
  enter() { this.showcase = false; this.elapsed = 9; this.cinematic = false; this.expandTarget = false; this.expanded = 0; }
  returnToTower() { this.showcase = true; this.elapsed = 9; this.cinematic = false; this.expandTarget = false; this.expanded = 0; }
  setReduced(v: boolean) {
    this.reduced = v;
    if (v) { this.elapsed = 9; this.cinematic = false; this.playing = false; }
  }
}
