import * as THREE from 'three';

/* ------------------------------------------------------------------ */
/*  Tooltip — hover detection + display                               */
/* ------------------------------------------------------------------ */
export class Tooltip {
  constructor(container, camera, canvas, markers, races) {
    this.races = races;
    this.camera = camera;
    this.canvas = canvas;
    this.markers = markers;

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Mesh = { threshold: 0.15 };
    this.mouse = new THREE.Vector2();

    this.el = container.querySelector('#tooltip');
    this.roundEl = this.el.querySelector('.tooltip-round');
    this.flagEl = this.el.querySelector('.tooltip-flag');
    this.nameEl = this.el.querySelector('.tooltip-name');
    this.circuitEl = this.el.querySelector('.tooltip-circuit');
    this.dateEl = this.el.querySelector('.tooltip-date');

    this.svgLine = container.querySelector('#tooltip-line');
    this.svgDot = container.querySelector('#tooltip-dot');

    this.hoveredRace = null;
    this.forcedRace = null; // Used when clicking sidebar
    this._pointerX = 0;
    this._pointerY = 0;

    this._onPointerMove = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this._pointerX = e.clientX - rect.left;
      this._pointerY = e.clientY - rect.top;
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    };
    canvas.addEventListener('pointermove', this._onPointerMove);
  }

  dispose() {
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
  }

  update() {
    // If a race is forced via sidebar, pin the tooltip to its 3D marker position
    if (this.forcedRace) {
      if (this.hoveredRace !== this.forcedRace) {
        this.hoveredRace = this.forcedRace;
        this._show(this.forcedRace);
      }
      
      // Find the marker for the forced race to get its 3D position
      let markerPos = null;
      this.markers.children.forEach((child) => {
        if (child.userData.race && child.userData.race.round === this.forcedRace.round) {
          markerPos = child.position.clone();
        }
      });

      if (markerPos) {
        // Project 3D position to 2D screen space
        markerPos.project(this.camera);
        const rect = this.canvas.getBoundingClientRect();
        
        // Calculate position relative to container
        this._pointerX = (markerPos.x * .5 + .5) * rect.width;
        this._pointerY = -(markerPos.y * .5 - .5) * rect.height;

        this._positionTooltip();
      }
      return;
    }

    this.raycaster.setFromCamera(this.mouse, this.camera);

    // Only test marker core meshes (those with .userData.race)
    const markerMeshes = [];
    this.markers.children.forEach((child) => {
      if (child.userData.race) markerMeshes.push(child);
    });

    const intersects = this.raycaster.intersectObjects(markerMeshes, false);

    if (intersects.length > 0) {
      const race = intersects[0].object.userData.race;
      if (race !== this.hoveredRace) {
        this.hoveredRace = race;
        this._show(race);
      }
      this._positionTooltip();
    } else {
      this._hide();
    }
  }

  _positionTooltip() {
    // Determine tooltip position
    let targetLeft = this._pointerX + 16;
    let targetTop = this._pointerY - 10;
    
    // We need the dimensions first
    const rect = this.el.getBoundingClientRect();
    const canvasRect = this.canvas.getBoundingClientRect();
    
    // Horizontal bounds check
    // If it overflows right, try placing it left of the pointer
    if (targetLeft + rect.width > canvasRect.width - 8) {
      targetLeft = this._pointerX - rect.width - 16;
    }
    // Hard clamp left padding
    if (targetLeft < 8) {
      targetLeft = 8;
    }
    // Hard clamp right padding (in case it's wider than the screen)
    if (targetLeft + rect.width > canvasRect.width - 8) {
      targetLeft = canvasRect.width - rect.width - 8;
    }

    // Vertical bounds check
    // If it overflows bottom, clamp
    if (targetTop + rect.height > canvasRect.height - 8) {
      targetTop = canvasRect.height - rect.height - 8;
    }
    // Hard clamp top
    if (targetTop < 8) {
      targetTop = 8;
    }

    // Assign final clamped positions
    this.el.style.left = `${targetLeft}px`;
    this.el.style.top = `${targetTop}px`;

    // Update SVG Line and Dot if available
    if (this.svgLine && this.svgDot) {
      this.svgDot.setAttribute('cx', this._pointerX);
      this.svgDot.setAttribute('cy', this._pointerY);

      this.svgLine.setAttribute('x1', this._pointerX);
      this.svgLine.setAttribute('y1', this._pointerY);

      // Point the line to the nearest vertical edge of the tooltip
      // The tooltip is either 16px to the right or 16px to the left
      const isLeft = targetLeft < this._pointerX;
      this.svgLine.setAttribute('x2', isLeft ? targetLeft + rect.width : targetLeft);
      // Point vertically to roughly the vertical center of the title, ~20px down from tooltip top
      this.svgLine.setAttribute('y2', targetTop + 20);
    }
  }

  _show(race) {
    const dateStr = new Date(race.date + 'T00:00:00').toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric',
    });
    this.roundEl.textContent = `Round ${race.round}`;
    if (this.flagEl && race.flag) {
      this.flagEl.src = `/images/flags/${race.flag}`;
      this.flagEl.alt = race.country || '';
      this.flagEl.style.display = '';
    } else if (this.flagEl) {
      this.flagEl.style.display = 'none';
    }
    this.nameEl.textContent = race.name;
    this.circuitEl.textContent = race.circuit;
    this.dateEl.textContent = dateStr;
    this.el.classList.remove('hidden');
    
    if (this.svgLine) this.svgLine.classList.remove('hidden');
    if (this.svgDot) this.svgDot.classList.remove('hidden');
  }

  _hide() {
    if (this.forcedRace) return; // Don't hide if forced
    this.hoveredRace = null;
    this.el.classList.add('hidden');
    
    if (this.svgLine) this.svgLine.classList.add('hidden');
    if (this.svgDot) this.svgDot.classList.add('hidden');
  }

  forceShow(race) {
    this.forcedRace = race;
  }

  clearForce() {
    this.forcedRace = null;
    this._hide();
  }
}
