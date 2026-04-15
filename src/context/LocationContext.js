import React, { createContext, useState, useEffect } from 'react';

export const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState('New Delhi, India');

  useEffect(() => {
    const savedLocation = localStorage.getItem('epic_eats_location');
    if (savedLocation) {
      setLocation(savedLocation);
    }
  }, []);

  const updateLocation = (newLocation) => {
    setLocation(newLocation);
    localStorage.setItem('epic_eats_location', newLocation);
  };

  return (
    <LocationContext.Provider value={{ location, updateLocation }}>
      {children}
    </LocationContext.Provider>
  );
};
