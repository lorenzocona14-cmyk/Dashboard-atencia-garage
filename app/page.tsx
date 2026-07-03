"use client";

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Car, Send, Users, RefreshCw, BarChart3, CalendarClock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import NavBar from './components/NavBar';
import SessionsMonitor from './components/SessionsMonitor'; // COMPONENTE NUEVO AGREGADO

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

interface CalendarioEvent {
  id: string;
  title: string;
  description: string;
  start: string;
  end: string | null;
  dateKey: string; // YYYY-MM-DD en horario Mendoza
  time: string;
}

interface AgendaItem {
  id: string;
  title: string;
  time: string;
  day: string;
}

// YYYY-MM-DD "de hoy" en horario Mendoza, para comparar contra dateKey de /api/calendario
function todayKeyMendoza(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Mendoza' });
}

export default function Dashboard() {
  const [turnosHoy, setTurnosHoy] = useState(0);
  const [encontradosHoy, setEncontradosHoy] = useState(0);
  const [enviadosHoy, setEnviadosHoy] = useState(0);
  const [chartData, setChartData] = useState<{ fecha: string; Turnos: number; Leads: number; Mensajes: number }[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchAgendaLocal = useCallback(async () => {
    try {
      const response = await fetch('/api/agenda', { cache: 'no-store' });
      const data = await response.json();
      if (!data.error) {
        setAgenda(data);
      }
    } catch (error) {
      console.error("Error cargando agenda:", error);
    }
  }, []);

  const fetchMetrics = useCallback(async () => {
    setIsRefreshing(true);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayIso = startOfToday.toISOString();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthIso = startOfMonth.toISOString();

    let turnosDelMes: CalendarioEvent[] = [];
    try {
      const res = await fetch(`/api/calendario?year=${now.getFullYear()}&month=${now.getMonth() + 1}`, { cache: 'no-store' });
      const data = await res.json();
      if (!data.error) turnosDelMes = data.events;
    } catch (error) {
      console.error('Error cargando turnos del mes:', error);
    }

    const todayKey = todayKeyMendoza();
    const turnosHoyCount = turnosDelMes.filter(e => e.dateKey === todayKey).length;

    const { data: dataScraperHoy } = await supabase.from('scraper_logs').select('items_extraidos').gte('created_at', todayIso);
    const totalEncontrados = dataScraperHoy?.reduce((acc, curr) => acc + (curr.items_extraidos || 0), 0) || 0;
    const { count: countEnviados } = await supabase.from('mensajes_scraper').select('*', { count: 'exact', head: true }).gte('created_at', todayIso);

    setTurnosHoy(turnosHoyCount);
    setEncontradosHoy(totalEncontrados);
    setEnviadosHoy(countEnviados || 0);

    const { data: scraperMes } = await supabase.from('scraper_logs').select('created_at, items_extraidos').gte('created_at', monthIso);
    const { data: mensajesMes } = await supabase.from('mensajes_scraper').select('created_at').gte('created_at', monthIso);

    const dataMap: Record<string, { fecha: string, Turnos: number, Leads: number, Mensajes: number }> = {};
    const formatToDay = (isoString: string) => {
      const d = new Date(isoString);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    };

    turnosDelMes.forEach(t => {
      const [, mm, dd] = t.dateKey.split('-');
      const d = `${dd}/${mm}`;
      if (!dataMap[d]) dataMap[d] = { fecha: d, Turnos: 0, Leads: 0, Mensajes: 0 };
      dataMap[d].Turnos += 1;
    });
    scraperMes?.forEach(s => {
      const d = formatToDay(s.created_at);
      if (!dataMap[d]) dataMap[d] = { fecha: d, Turnos: 0, Leads: 0, Mensajes: 0 };
      dataMap[d].Leads += (s.items_extraidos || 0);
    });
    mensajesMes?.forEach(m => {
      const d = formatToDay(m.created_at);
      if (!dataMap[d]) dataMap[d] = { fecha: d, Turnos: 0, Leads: 0, Mensajes: 0 };
      dataMap[d].Mensajes += 1;
    });

    const sortedData = Object.values(dataMap).sort((a, b) => {
      const [dayA, monthA] = a.fecha.split('/');
      const [dayB, monthB] = b.fecha.split('/');
      return new Date(now.getFullYear(), Number(monthA) - 1, Number(dayA)).getTime() - new Date(now.getFullYear(), Number(monthB) - 1, Number(dayB)).getTime();
    });

    setChartData(sortedData);
    fetchAgendaLocal();

    setTimeout(() => setIsRefreshing(false), 500);
  }, [fetchAgendaLocal]);

  useEffect(() => {
    fetchMetrics();

    const intervalId = setInterval(fetchMetrics, 120000);

    const scraperSub = supabase.channel('scraper_changes').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scraper_logs' }, fetchMetrics).subscribe();
    const mensajesSub = supabase.channel('mensajes_changes').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_scraper' }, fetchMetrics).subscribe();

    return () => {
      clearInterval(intervalId);
      supabase.removeChannel(scraperSub);
      supabase.removeChannel(mensajesSub);
    };
  }, [fetchMetrics]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans selection:bg-cyan-500/30 pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Dashboard Atencia Garage</h1>
          <p className="text-zinc-400 mt-2 text-sm">Chatbot y Bot scrapper</p>
        </header>

        <NavBar />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between h-40 shadow-xl shadow-black/50 transition-all hover:border-zinc-700">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-sm font-medium tracking-wide">Turnos Agendados</span>
              <Car className="w-5 h-5 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-light text-white">{turnosHoy}</span>
              <span className="text-xs text-zinc-500 font-medium">HOY</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between h-40 shadow-xl shadow-black/50 transition-all hover:border-zinc-700">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-sm font-medium tracking-wide">Leads Encontrados</span>
              <Users className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-light text-white">{encontradosHoy}</span>
              <span className="text-xs text-zinc-500 font-medium">HOY</span>
            </div>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between h-40 shadow-xl shadow-black/50 transition-all hover:border-zinc-700">
            <div className="flex items-center justify-between text-zinc-400">
              <span className="text-sm font-medium tracking-wide">Mensajes Enviados</span>
              <Send className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-light text-white">{enviadosHoy}</span>
              <span className="text-xs text-zinc-500 font-medium">HOY</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl shadow-black/50">
            <div className="flex items-center gap-2 mb-8">
              <BarChart3 className="w-5 h-5 text-zinc-400" />
              <h2 className="text-lg font-medium text-zinc-200 tracking-wide">Rendimiento Mensual</h2>
            </div>
            {chartData.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="fecha" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                    <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip cursor={{ fill: '#27272a', opacity: 0.4 }} contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#f4f4f5' }} itemStyle={{ fontSize: '14px' }} />
                    <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
                    <Bar dataKey="Turnos" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Leads" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="Mensajes" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 w-full flex items-center justify-center text-zinc-500 text-sm">No hay datos registrados este mes para graficar.</div>
            )}
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl shadow-black/50 flex flex-col h-[400px]">
            <div className="flex items-center gap-2 mb-6">
              <CalendarClock className="w-5 h-5 text-zinc-400" />
              <h2 className="text-lg font-medium text-zinc-200 tracking-wide">Próximos Turnos (7 días)</h2>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent">
              {agenda.length > 0 ? (
                agenda.map((turno) => (
                  <div key={turno.id} className="flex justify-between items-center p-3.5 rounded-xl bg-zinc-950/50 border border-zinc-800/80 hover:border-cyan-500/30 transition-colors">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="w-2 h-2 rounded-full bg-cyan-400 flex-shrink-0"></div>
                      <div className="flex flex-col overflow-hidden">
                        <span className="text-sm text-zinc-200 truncate">{turno.title}</span>
                        <span className="text-xs text-zinc-500 capitalize">{turno.day}</span>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-cyan-400 bg-cyan-400/10 px-2 py-1 rounded-md ml-3 whitespace-nowrap">
                      {turno.time}
                    </span>
                  </div>
                ))
              ) : (
                <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                  Agenda libre por ahora.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CONTENEDOR NUEVO DEL MONITOR DE SESIONES */}
        <div className="w-full">
           <SessionsMonitor />
        </div>

        {/* BOTÓN FLOTANTE ALINEADO */}
        <button
          onClick={fetchMetrics}
          className="fixed bottom-8 right-8 bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-full shadow-2xl border border-zinc-700 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-zinc-500 z-50"
          aria-label="Refrescar métricas"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-cyan-400' : 'text-zinc-300'}`} />
        </button>
      </div>
    </div>
  );
}
