import React, { useState, useEffect } from 'react';

export default function SessionsMonitor() {
  const [activeSessions, setActiveSessions] = useState([]);
  
  // URL de exportación directa del CSV de Google Sheets para lectura rápida
  const sheetsCsvUrl = "https://docs.google.com/spreadsheets/d/16qQNcCneRA-4Q9y8mdp2puXs-UWgHGvieB18AlzKGgw/gviz/tq?tqx=out:csv&sheet=Sesiones";

  useEffect(() => {
    fetch(sheetsCsvUrl)
      .then(res => res.text())
      .then(csv => {
         // Parseo manual rápido omitiendo la cabecera
         const rows = csv.split('\n').slice(1);
         const active = rows.map(row => {
           const cols = row.replace(/"/g, '').split(',');
           return { telefono: cols[0], estado: cols[1], ultimaVez: cols[2] };
         }).filter(s => s.estado === 'agendando');
         setActiveSessions(active);
      });
  }, []);

  const forceClose = async (telefono) => {
    // Llamada al webhook de n8n para forzar el cierre de la sesión
    await fetch('TU_WEBHOOK_N8N/forzar-cierre', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ telefono })
    });
    // Se remueve de la interfaz inmediatamente
    setActiveSessions(prev => prev.filter(s => s.telefono !== telefono));
  };

  return (
    <div className="bg-[#121212] text-[#E0E0E0] p-6 rounded-xl border border-[#2A2A2A] shadow-md w-full">
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
