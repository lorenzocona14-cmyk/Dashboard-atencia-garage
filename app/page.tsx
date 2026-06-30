"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Car, Send, Users, RefreshCw, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Dashboard() {
  const [turnosHoy, setTurnosHoy] = useState(0);
  const [encontradosHoy, setEncontradosHoy] = useState(0);
  const [enviadosHoy, setEnviadosHoy] = useState(0);
  const [chartData, setChartData] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMetrics = async () => {
    setIsRefreshing(true);
    const now = new Date();
    
    // Rango Diario
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayIso = startOfToday.toISOString();

    // Rango Mensual
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthIso = startOfMonth.toISOString();

    // --- FETCH DIARIO (Tarjetas Superiores) ---
    const { count: countTurnos } = await supabase
      .from('lavadero_turnos')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayIso);
    
    const { data: dataScraperHoy } = await supabase
      .from('scraper_logs')
      .select('items_extraidos')
      .gte('created_at', todayIso);
    const totalEncontrados = dataScraperHoy?.reduce((acc, curr) => acc + (curr.items_extraidos || 0), 0) || 0;

    const { count: countEnviados } = await supabase
      .from('mensajes_scraper')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayIso);

    setTurnosHoy(countTurnos || 0);
    setEncontradosHoy(totalEncontrados);
    setEnviadosHoy(countEnviados || 0);

    // --- FETCH MENSUAL (Gráfico) ---
    const { data: turnosMes } = await supabase.from('lavadero_turnos').select('created_at').gte('created_at', monthIso);
    const { data: scraperMes } = await supabase.from('scraper_logs').select('created_at, items_extraidos').gte('created_at', monthIso);
    const { data: mensajesMes } = await supabase.from('mensajes_scraper').select('created_at').gte('created_at', monthIso);

    // Agrupación de datos por día para el gráfico
    const dataMap: Record<string, { fecha: string, Turnos: number, Leads: number, Mensajes: number }> = {};

    const formatToDay = (isoString: string) => {
      const d = new Date(isoString);
      return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
    };

    turnosMes?.forEach(t => {
      const d = formatToDay(t.created_at);
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

    // Ordenar cronológicamente
    const sortedData = Object.values(dataMap).sort((a, b) => {
      const [dayA, monthA] = a.fecha.split('/');
      const [dayB, monthB] = b.fecha.split('/');
      return new Date(2024, Number(monthA)-1, Number(dayA)).getTime() - new Date(2024, Number(monthB)-1, Number(dayB)).getTime();
    });

    setChartData(sortedData);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    fetchMetrics();

    // Suscripciones Realtime
    const turnosSub = supabase.channel('turnos_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'lavadero_turnos' }, fetchMetrics)
      .subscribe();
    const scraperSub = supabase.channel('scraper_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'scraper_logs' }, fetchMetrics)
      .subscribe();
    const mensajesSub = supabase.channel('mensajes_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes_scraper' }, fetchMetrics)
      .subscribe();

    return () => {
      supabase.removeChannel(turnosSub);
      supabase.removeChannel(scraperSub);
      supabase.removeChannel(mensajesSub);
    };
  }, []);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans selection:bg-cyan-500/30 pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Centro de Comando</h1>
          <p className="text-zinc-400 mt-2 text-sm">Métricas en tiempo real sincronizadas con n8n</p>
        </header>

        {/* MÉTRICAS DIARIAS */}
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

        {/* VISTA MENSUAL (GRÁFICO) */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl shadow-black/50">
          <div className="flex items-center gap-2 mb-8">
            <BarChart3 className="w-5 h-5 text-zinc-400" />
            <h2 className="text-lg font-medium text-zinc-200 tracking-wide">Rendimiento Mensual</h2>
          </div>
          
          {chartData.length > 0 ? (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                  <XAxis dataKey="fecha" stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                  <YAxis stroke="#a1a1aa" fontSize={12} tickLine={false} axisLine={false} />
                  <Tooltip 
                    cursor={{ fill: '#27272a', opacity: 0.4 }}
                    contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#f4f4f5' }}
                    itemStyle={{ fontSize: '14px' }}
                  />
                  <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '13px' }} />
                  <Bar dataKey="Turnos" fill="#22d3ee" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Leads" fill="#34d399" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  <Bar dataKey="Mensajes" fill="#818cf8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-80 w-full flex items-center justify-center text-zinc-500 text-sm">
              No hay datos registrados este mes para graficar.
            </div>
          )}
        </div>

        {/* BOTÓN FLOTANTE */}
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