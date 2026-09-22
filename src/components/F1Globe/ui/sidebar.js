
/* ------------------------------------------------------------------ */
/*  Sidebar — race calendar with expand/collapse                      */
/* ------------------------------------------------------------------ */
export class Sidebar {
  constructor(container, controls, tooltip, races) {
    this.races = races;
    this.controls = controls;
    this.tooltip = tooltip;

    this.listEl = container.querySelector('#race-list');
    this.sidebarEl = container.querySelector('#sidebar');
    this.toggleBtn = container.querySelector('#sidebar-toggle');
    this.zoomOutTimeout = null;

    if (this.listEl) this.listEl.innerHTML = ''; // Prevent strict mode duplication
    this.zoomOutTimeout = null;

    this._buildList();
    this._bindToggle();
  }

  _buildList() {
    let nextRaceElement = null;

    this.races.forEach((race) => {
      const passed = race.countDownDate 
        ? new Date() > new Date(race.countDownDate) 
        : (race.date && race.ukTime ? new Date() > new Date(`${race.date}T${race.ukTime}:00Z`) : false);

      const li = document.createElement('li');
      li.className = `race-item${passed ? ' passed' : ''}`;
      li.dataset.round = race.round;

      const dateStr = new Date(race.date + 'T00:00:00').toLocaleDateString('en-US', {
        month: 'short', day: 'numeric',
      });

      const flagSrc = race.flag ? `/images/flags/${race.flag}` : '';

      li.innerHTML = `
        <div class="race-item-header">
          <span class="race-item-round">R${race.round}</span>
          ${flagSrc ? `<img class="race-item-flag" src="${flagSrc}" alt="${race.country || ''}" />` : ''}
          <span class="race-item-name">${race.name}</span>
          <span class="race-item-date">${dateStr}</span>
          <span class="race-item-arrow">&#9662;</span>
        </div>
        <div class="race-item-details">
          <div class="race-item-circuit">${race.circuit}</div>
          <div class="race-item-location">${race.city}, ${race.country}</div>
        </div>
      `;

      // Click to expand/collapse
      const header = li.querySelector('.race-item-header');
      header.addEventListener('click', (e) => {
        e.stopPropagation();
        const wasExpanded = li.classList.contains('expanded');
        
        // Clear any pending zoom out
        if (this.zoomOutTimeout) {
          clearTimeout(this.zoomOutTimeout);
          this.zoomOutTimeout = null;
        }

        // Collapse all
        document.querySelectorAll('.race-item.expanded').forEach((el) => {
          el.classList.remove('expanded');
        });

        if (!wasExpanded) {
          li.classList.add('expanded');
          this.controls.focusOn(race.lat, race.lng);
          this.tooltip.forceShow(race);

          // Auto zoom out after 3 seconds
          this.zoomOutTimeout = setTimeout(() => {
            li.classList.remove('expanded');
            this.controls.resetFocus();
            this.tooltip.clearForce();
            this.zoomOutTimeout = null;
          }, 4000);

          // Close sidebar on mobile
          if (window.innerWidth <= 768) {
            this.sidebarEl.classList.remove('open');
          }
        } else {
          this.controls.resetFocus();
          this.tooltip.clearForce();
        }
      });

      this.listEl.appendChild(li);

      if (!passed && !nextRaceElement) {
        nextRaceElement = li;
      }
    });

    if (nextRaceElement && this.listEl) {
      setTimeout(() => {
        const listRect = this.listEl.getBoundingClientRect();
        const elRect = nextRaceElement.getBoundingClientRect();
        this.listEl.scrollBy({ top: elRect.top - listRect.top, behavior: 'smooth' });
      }, 100);
    }
  }

  _bindToggle() {
    this._toggleHandler = (e) => {
      e.stopPropagation();
      this.sidebarEl.classList.toggle('open');
    };
    this.toggleBtn.addEventListener('click', this._toggleHandler);

    // Close sidebar when clicking outside on mobile
    this._docClickHandler = (e) => {
      if (
        window.innerWidth <= 768 &&
        this.sidebarEl.classList.contains('open') &&
        !this.sidebarEl.contains(e.target) &&
        !this.toggleBtn.contains(e.target)
      ) {
        this.sidebarEl.classList.remove('open');
      }
    };
    document.addEventListener('click', this._docClickHandler);
  }

  dispose() {
    this.toggleBtn.removeEventListener('click', this._toggleHandler);
    document.removeEventListener('click', this._docClickHandler);
    if (this.zoomOutTimeout) {
      clearTimeout(this.zoomOutTimeout);
    }
    // Remove individual list item event listeners by recreating list? Or just reset innerHTML
    if (this.listEl) this.listEl.innerHTML = '';
  }

  highlightRound(round) {
    document.querySelectorAll('.race-item').forEach((el) => {
      el.classList.toggle('active', Number(el.dataset.round) === round);
    });
  }
}
