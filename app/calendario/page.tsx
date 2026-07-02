"use client";

import { useEffect, useState, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, RefreshCw, CalendarDays, X, Clock } from 'lucide-react';
import NavBar from '../components/NavBar';

interface CalendarioEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string | null;
  dateKey: string; // YYYY-MM-DD en horario Mendoza
  time: string;
}

const NOMBRES_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const DIAS_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function todayKeyMendoza(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Mendoza' });
}

// Genera la grilla del mes (semanas completas, empezando en lunes) como YYYY-MM-DD locales.
function buildMonthGrid(year: number, month: number): { key: string; inMonth: boolean }[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const firstWeekday = (firstOfMonth.getDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(year, month, 0).getDate();
  const daysInPrevMonth = new Date(year, month - 1, 0).getDate();

  const cells: { key: string; inMonth: boolean }[] = [];

  const pad = (n: number) => n.toString().padStart(2, '0');
  const prevMonth = month === 1 ? 12 : month - 1;
  const prevYear = month === 1 ? year - 1 : year;
  for (let i = firstWeekday - 1; i >= 0; i--) {
    cells.push({ key: `${prevYear}-${pad(prevMonth)}-${pad(daysInPrevMonth - i)}`, inMonth: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ key: `${year}-${pad(month)}-${pad(d)}`, inMonth: true });
  }
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;
  while (cells.length % 7 !== 0) {
    const dayNum = cells.length - (firstWeekday + daysInMonth) + 1;
    cells.push({ key: `${nextYear}-${pad(nextMonth)}-${pad(dayNum)}`, inMonth: false });
  }

  return cells;
}

export default function CalendarioPage() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1); // 1-12
  const [events, setEvents] = useState<CalendarioEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const fetchMonth = useCallback(async (y: number, m: number) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/calendario?year=${y}&month=${m}`, { cache: 'no-store' });
      const data = await res.json();
      setEvents(data.error ? [] : data.events);
    } catch (error) {
      console.error('Error cargando calendario:', error);
      setEvents([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMonth(year, month);
  }, [year, month, fetchMonth]);

  const eventsByDay = useMemo(() => {
    const map: Record<string, CalendarioEvent[]> = {};
    for (const e of events) {
      if (!map[e.dateKey]) map[e.dateKey] = [];
      map[e.dateKey].push(e);
    }
    return map;
  }, [events]);

  const grid = useMemo(() => buildMonthGrid(year, month), [year, month]);
  const todayKey = todayKeyMendoza();

  const goToPrevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); } else { setMonth(m => m - 1); }
  };
  const goToNextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); } else { setMonth(m => m + 1); }
  };
  const goToToday = () => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); };

  const selectedEvents = selectedDay ? (eventsByDay[selectedDay] || []) : [];

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans selection:bg-cyan-500/30 pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Centro de Comando</h1>
          <p className="text-zinc-400 mt-2 text-sm">Métricas en tiempo real sincronizadas con n8n y Google Calendar</p>
        </header>

        <NavBar />

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl shadow-black/50">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-zinc-400" />
              <h2 className="text-lg font-medium text-zinc-200 tracking-wide">
                {NOMBRES_MES[month - 1]} {year}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={goToToday} className="text-xs font-medium text-zinc-300 bg-zinc-800 hover:bg-zinc-700 px-3 py-2 rounded-lg transition-colors">
                Hoy
              </button>
              <button onClick={goToPrevMonth} aria-label="Mes anterior" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
                <ChevronLeft className="w-4 h-4 text-zinc-300" />
              </button>
              <button onClick={goToNextMonth} aria-label="Mes siguiente" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
                <ChevronRight className="w-4 h-4 text-zinc-300" />
              </button>
              <button onClick={() => fetchMonth(year, month)} aria-label="Refrescar" className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors">
                <RefreshCw className={`w-4 h-4 text-zinc-300 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 mb-1.5">
            {DIAS_SEMANA.map(d => (
              <div key={d} className="text-center text-xs font-medium text-zinc-500 py-2 tracking-wide">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {grid.map(({ key, inMonth }) => {
              const dayEvents = eventsByDay[key] || [];
              const dayNum = parseInt(key.split('-')[2], 10);
              const isToday = key === todayKey;

              return (
                <button
                  key={key}
                  onClick={() => dayEvents.length > 0 && setSelectedDay(key)}
                  className={`text-left rounded-xl p-2 h-24 sm:h-28 flex flex-col border transition-colors overflow-hidden
                    ${inMonth ? 'bg-zinc-950/50 border-zinc-800/80' : 'bg-zinc-950/20 border-zinc-900 text-zinc-600'}
                    ${dayEvents.length > 0 ? 'hover:border-cyan-500/40 cursor-pointer' : 'cursor-default'}
                  `}
                >
                  <span className={`text-xs font-medium mb-1 inline-flex items-center justify-center w-6 h-6 rounded-full
                    ${isToday ? 'bg-cyan-500 text-zinc-950 font-semibold' : inMonth ? 'text-zinc-300' : 'text-zinc-600'}`}>
                    {dayNum}
                  </span>
                  <div className="flex-1 overflow-hidden space-y-1">
                    {dayEvents.slice(0, 2).map(e => (
                      <div key={e.id} className="text-[10px] leading-tight bg-cyan-400/10 text-cyan-300 rounded px-1.5 py-0.5 truncate">
                        {e.time} · {e.title}
                      </div>
                    ))}
                    {dayEvents.length > 2 && (
                      <div className="text-[10px] text-zinc-500 px-1.5">+{dayEvents.length - 2} más</div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {!isLoading && events.length === 0 && (
            <div className="text-center text-zinc-500 text-sm py-8">No hay turnos cargados este mes.</div>
          )}
        </div>
      </div>

      {selectedDay && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelectedDay(null)}>
          <div
            className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-md shadow-2xl max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-zinc-100">
                {new Date(selectedDay + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </h3>
              <button onClick={() => setSelectedDay(null)} className="p-1.5 rounded-lg hover:bg-zinc-800 transition-colors">
                <X className="w-4 h-4 text-zinc-400" />
              </button>
            </div>
            <div className="space-y-3">
              {selectedEvents.map(e => (
                <div key={e.id} className="p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800/80">
                  <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold mb-1">
                    <Clock className="w-3.5 h-3.5" />
                    {e.time}
                  </div>
                  <div className="text-sm text-zinc-100 font-medium">{e.title}</div>
                  {e.description && (
                    <div className="text-xs text-zinc-500 mt-1 whitespace-pre-line">{e.description}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
