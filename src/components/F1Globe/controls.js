/* ------------------------------------------------------------------ */
/*  Orbital controls — drag rotate, scroll zoom, touch, auto-rotate  */
/* ------------------------------------------------------------------ */
export class OrbitalControls {
  constructor(camera, canvas, globeGroup) {
    this.camera = camera;
    this.canvas = canvas;
    this.globeGroup = globeGroup;

    // Spherical state
    this.phi = Math.PI / 2.2;   // latitude angle
    this.theta = -0.5;          // longitude angle
    this.defaultRadius = window.innerWidth <= 768 ? 24 : 14;
    this.radius = this.defaultRadius;

    // Targets for smooth interpolation
    this.targetPhi = this.phi;
    this.targetTheta = this.theta;
    this.targetRadius = this.radius;

    // Constraints
    this.minRadius = 7.5;
    this.maxRadius = 30;
    this.minPhi = 0.2;
    this.maxPhi = Math.PI - 0.2;

    // Damping
    this.damping = 0.08;

    // Drag state
    this.isDragging = false;
    this.prevMouse = { x: 0, y: 0 };
    this.rotateSpeed = 0.005;

    // Auto-rotate
    this.autoRotate = true;
    this.autoRotateSpeed = 0.0008;
    this.idleTimeout = 3000; // ms
    this.lastInteraction = 0;

    // Touch state
    this.touchStartDistance = 0;

    this._bindEvents();
    this._updateCamera();
  }

  _bindEvents() {
    const c = this.canvas;

    // Store bound handlers for cleanup
    this._onPointerDownBound = (e) => this._onPointerDown(e);
    this._onPointerMoveBound = (e) => this._onPointerMove(e);
    this._onPointerUpBound = () => this._onPointerUp();
    this._onWheelBound = (e) => this._onWheel(e);
    this._onTouchStartBound = (e) => this._onTouchStart(e);
    this._onTouchMoveBound = (e) => this._onTouchMove(e);
    this._onTouchEndBound = () => this._onTouchEnd();

    // Mouse
    c.addEventListener('pointerdown', this._onPointerDownBound);
    window.addEventListener('pointermove', this._onPointerMoveBound);
    window.addEventListener('pointerup', this._onPointerUpBound);

    // Scroll zoom
    c.addEventListener('wheel', this._onWheelBound, { passive: false });

    // Touch
    c.addEventListener('touchstart', this._onTouchStartBound, { passive: false });
    c.addEventListener('touchmove', this._onTouchMoveBound, { passive: false });
    c.addEventListener('touchend', this._onTouchEndBound);
  }

  dispose() {
    const c = this.canvas;
    c.removeEventListener('pointerdown', this._onPointerDownBound);
    window.removeEventListener('pointermove', this._onPointerMoveBound);
    window.removeEventListener('pointerup', this._onPointerUpBound);
    c.removeEventListener('wheel', this._onWheelBound);
    c.removeEventListener('touchstart', this._onTouchStartBound);
    c.removeEventListener('touchmove', this._onTouchMoveBound);
    c.removeEventListener('touchend', this._onTouchEndBound);
  }

  _onPointerDown(e) {
    this.isDragging = true;
    this.prevMouse = { x: e.clientX, y: e.clientY };
    this.lastInteraction = performance.now();
    this.autoRotate = false;
  }

  _onPointerMove(e) {
    if (!this.isDragging) return;
    const dx = e.clientX - this.prevMouse.x;
    const dy = e.clientY - this.prevMouse.y;
    this.targetTheta += dx * this.rotateSpeed;
    this.targetPhi = Math.max(
      this.minPhi,
      Math.min(this.maxPhi, this.targetPhi - dy * this.rotateSpeed)
    );
    this.prevMouse = { x: e.clientX, y: e.clientY };
    this.lastInteraction = performance.now();
  }

  _onPointerUp() {
    this.isDragging = false;
    this.lastInteraction = performance.now();
  }

  _onWheel(e) {
    e.preventDefault();
    this.targetRadius = Math.max(
      this.minRadius,
      Math.min(this.maxRadius, this.targetRadius + e.deltaY * 0.01)
    );
    this.lastInteraction = performance.now();
    this.autoRotate = false;
  }

  _onTouchStart(e) {
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      this.touchStartDistance = this._getTouchDistance(e.touches);
    }
    this.lastInteraction = performance.now();
    this.autoRotate = false;
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.prevMouse.x;
      const dy = e.touches[0].clientY - this.prevMouse.y;
      this.targetTheta += dx * this.rotateSpeed;
      this.targetPhi = Math.max(
        this.minPhi,
        Math.min(this.maxPhi, this.targetPhi - dy * this.rotateSpeed)
      );
      this.prevMouse = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    } else if (e.touches.length === 2) {
      const dist = this._getTouchDistance(e.touches);
      const delta = this.touchStartDistance - dist;
      this.targetRadius = Math.max(
        this.minRadius,
        Math.min(this.maxRadius, this.targetRadius + delta * 0.02)
      );
      this.touchStartDistance = dist;
    }
    this.lastInteraction = performance.now();
  }

  _onTouchEnd() {
    this.isDragging = false;
    this.lastInteraction = performance.now();
  }

  _getTouchDistance(touches) {
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  _updateCamera() {
    const x = this.radius * Math.sin(this.phi) * Math.cos(this.theta);
    const y = this.radius * Math.cos(this.phi);
    const z = this.radius * Math.sin(this.phi) * Math.sin(this.theta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  update() {
    // Auto-rotate on idle
    const now = performance.now();
    if (!this.isDragging && now - this.lastInteraction > this.idleTimeout) {
      this.autoRotate = true;
    }
    if (this.autoRotate) {
      this.targetTheta += this.autoRotateSpeed;
    }

    // Smooth interpolation
    this.phi += (this.targetPhi - this.phi) * this.damping;
    this.theta += (this.targetTheta - this.theta) * this.damping;
    this.radius += (this.targetRadius - this.radius) * this.damping;

    this._updateCamera();
  }

  // Rotate globe to face a specific lat/lng
  focusOn(lat, lng) {
    const phi = (90 - lat) * (Math.PI / 180);
    const targetThetaBase = -(lng + 180) * (Math.PI / 180) + Math.PI;

    // Find shortest path based on current theta to prevent long backward spins
    const currentTheta = this.theta;
    let diff = (targetThetaBase - currentTheta) % (2 * Math.PI);
    if (diff > Math.PI) diff -= 2 * Math.PI;
    if (diff < -Math.PI) diff += 2 * Math.PI;

    this.targetPhi = phi;
    this.targetTheta = currentTheta + diff;
    this.targetRadius = 10; // Zoom in
    this.autoRotate = false;
    this.lastInteraction = performance.now();
  }

  // Reset to default zoomed-out view
  resetFocus() {
    this.targetPhi = Math.PI / 2.2;
    this.targetTheta = this.theta; // keep current rotation longitude
    this.targetRadius = this.defaultRadius; // Default zoom out
    // Re-enable autoRotate immediately or let idleTimeout handle it
    this.lastInteraction = performance.now();
  }
}