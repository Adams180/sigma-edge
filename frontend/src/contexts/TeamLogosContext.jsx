import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';

const TeamLogosContext = createContext({});

export function TeamLogosProvider({ children }) {
  const [logos, setLogos] = useState({});

  useEffect(() => {
    api.teamLogos()
      .then(data => { if (data?.logos) setLogos(data.logos); })
      .catch(() => {});
  }, []);

  return (
    <TeamLogosContext.Provider value={logos}>
      {children}
    </TeamLogosContext.Provider>
  );
}

export function useTeamLogos() {
  return useContext(TeamLogosContext);
}
