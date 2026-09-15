import React, { createContext, useContext, useState, useEffect } from 'react';

const PreferencesContext = createContext();

export const usePreferences = () => useContext(PreferencesContext);

export const PreferencesProvider = ({ children }) => {
  const [useCelsius, setUseCelsius] = useState(() => {
    return localStorage.getItem('useCelsius') !== 'false';
  });

  const [useKmh, setUseKmh] = useState(() => {
    return localStorage.getItem('useKmh') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('useCelsius', useCelsius);
  }, [useCelsius]);

  useEffect(() => {
    localStorage.setItem('useKmh', useKmh);
  }, [useKmh]);

  const toggleCelsius = () => setUseCelsius((prev) => !prev);
  const toggleKmh = () => setUseKmh((prev) => !prev);

  return (
    <PreferencesContext.Provider value={{ useCelsius, useKmh, toggleCelsius, toggleKmh }}>
      {children}
    </PreferencesContext.Provider>
  );
};
