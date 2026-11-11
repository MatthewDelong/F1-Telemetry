import React, { useState } from 'react';
import DriversTab from './DriversTab';
import ConstructorsTab from './ConstructorsTab';
import './StatsPage.scss';

const THIS_YEAR = new Date().getFullYear();

const TABS = {
  drivers: { label: 'Drivers', Component: DriversTab },
  constructors: { label: 'Constructors', Component: ConstructorsTab },
};

export const StatsPage = () => {
  const [page, setPage] = useState('drivers');
  const [season, setSeason] = useState(THIS_YEAR);
  const { Component } = TABS[page];

  const tabSwitcher = (
    <nav className="stats-tab-nav" aria-label="Stats view selector">
      {Object.entries(TABS).map(([id, item]) => (
        <button
          key={id}
          type="button"
          className={`stats-tab-btn${page === id ? ' active' : ''}`}
          aria-current={page === id ? 'page' : undefined}
          onClick={() => setPage(id)}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );

  return (
    <div className="f1-stats-page">
      <Component season={season} setSeason={setSeason} tabSwitcher={tabSwitcher} />
    </div>
  );
};

export default StatsPage;

