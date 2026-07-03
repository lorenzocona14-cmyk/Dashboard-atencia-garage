import React, { useState, useEffect } from 'react';

// 1. Definimos la interfaz de la sesión
interface Session {
  telefono: string;
  estado: string;
  ultimaVez: string;
}

export default function SessionsMonitor() {
  // 2. Le decimos al estado que va a ser un array de objetos tipo Session
  const [activeSessions, setActiveSessions] = useState<Session[]>([]);
  
  const sheetsCsvUrl = "https://docs.google.com/spreadsheets/d/16qQNcCneRA-4Q9y8mdp2puXs-UWgHGvieB18AlzKGgw/gviz/tq?tqx=out:csv&sheet=Sesiones";

  useEffect(() => {
    fetch(sheetsCsvUrl)
      .then(res => res.text())
      .then(csv => {
         const rows = csv.split('\n').slice(1);
         const active: Session[] = rows.map(row => { // 3. Tipamos el array temporal también
           const cols = row.replace(/"/g, '').split(',');
           return { telefono: cols[0], estado: cols[1], ultimaVez: cols[2] };
         }).filter(s => s.estado === 'agendando');
         
         setActiveSessions(active);
      });
  }, []);

  // 4. Tipamos el parámetro telefono
  const forceClose = async (telefono: string) => {
    await fetch('https://n8n.66.94.104.64.nip.io/webhook/forzar-cierre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono })
    });
    setActiveSessions(prev => prev.filter(s => s.telefono !== telefono));
  };

  return (
    <div className="bg-zinc-900 text-[#E0E0E0] p-6 rounded-xl border border-zinc-800 shadow-md w-full">
      <h2 className="text-xl font-semibold mb-4 tracking-wide text-white">Monitor de Sesiones Activas</h2>
      <div className="grid grid-cols-1 gap-4">
        {activeSessions.length === 0 ? (
          <p className="text-[#888888] text-sm">No hay clientes agendando en este momento.</p>
        ) : (
          activeSessions.map((session, idx) => (
            <div key={idx} className="flex justify-between items-center bg-[#1A1A1A] p-4 rounded-lg border border-[#333333]">
              <div>
                <p className="text-md font-medium text-white">{session.telefono}</p>
                <p className="text-xs text-[#888888]">Última interacción: {new Date(session.ultimaVez).toLocaleTimeString()}</p>
              </div>
              <button 
                onClick={() => forceClose(session.telefono)}
                className="bg-[#D32F2F] hover:bg-[#B71C1C] text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Forzar Cierre
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
