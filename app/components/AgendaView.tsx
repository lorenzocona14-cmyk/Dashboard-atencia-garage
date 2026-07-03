import React, { useState, useEffect } from 'react';

export default function AgendaView() {
  const [appointments, setAppointments] = useState([]);

  useEffect(() => {
    // Reemplaza con la URL de tu Webhook GET de n8n que trae el calendario
    fetch('TU_WEBHOOK_N8N/agenda-hoy')
      .then(res => res.json())
      .then(data => setAppointments(data));
  }, []);

  const renderServiceTag = (title) => {
    const isLube = title.toLowerCase().includes('aceite') || title.toLowerCase().includes('filtro');
    return isLube ? (
      <span className="bg-[#1E3A8A] text-[#93C5FD] text-xs px-2 py-1 rounded-full">Lubricentro</span>
    ) : (
      <span className="bg-[#064E3B] text-[#6EE7B7] text-xs px-2 py-1 rounded-full">Lavadero</span>
    );
  };

  return (
    <div className="bg-[#121212] text-[#E0E0E0] p-6 rounded-xl border border-[#2A2A2A] shadow-md w-full relative h-full min-h-[400px]">
      <h2 className="text-xl font-semibold mb-4 tracking-wide text-white">Agenda de Hoy</h2>
      <div className="grid grid-cols-1 gap-3">
        {appointments.length === 0 ? (
          <p className="text-[#888888] text-sm">No hay turnos programados para hoy.</p>
        ) : (
          appointments.map((appt, idx) => (
            <div key={idx} className="flex flex-col bg-[#1A1A1A] p-4 rounded-lg border border-[#333333]">
              <div className="flex justify-between items-start mb-2">
                <p className="text-md font-medium text-white">{appt.summary}</p>
                {renderServiceTag(appt.summary)}
              </div>
              <p className="text-xs text-[#888888]">
                {new Date(appt.start).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {new Date(appt.end).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
              </p>
            </div>
          ))
        )}
      </div>

      {/* Botón flotante estrictamente alineado */}
      <button 
        className="fixed bottom-8 right-8 w-14 h-14 bg-[#2563EB] hover:bg-[#1D4ED8] rounded-full shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center transition-transform hover:scale-105 z-50"
        onClick={() => window.location.reload()}
        title="Actualizar Dashboard"
      >
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
}
