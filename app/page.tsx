"use client";

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Car, Send, Users, RefreshCw } from 'lucide-react';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export default function Dashboard() {
  const [turnosHoy, setTurnosHoy] = useState(0);
  const [encontradosHoy, setEncontradosHoy] = useState(0);
  const [enviadosHoy, setEnviadosHoy] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchMetrics = async () => {
    setIsRefreshing(true);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayIso = today.toISOString();

    const { count: countTurnos } = await supabase
      .from('lavadero_turnos')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayIso);
    
    const { data: dataScraper } = await supabase
      .from('scraper_logs')
      .select('items_extraidos')
      .gte('created_at', todayIso);
    
    const totalEncontrados = dataScraper?.reduce((acc, curr) => acc + (curr.items_extraidos || 0), 0) || 0;

    const { count: countEnviados } = await supabase
      .from('mensajes_scraper')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', todayIso);

    setTurnosHoy(countTurnos || 0);
    setEncontradosHoy(totalEncontrados);
    setEnviadosHoy(countEnviados || 0);
    
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    fetchMetrics();

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
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans selection:bg-cyan-500/30">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Centro de Comando</h1>
          <p className="text-zinc-400 mt-2 text-sm">Métricas en tiempo real sincronizadas con n8n</p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <button 
          onClick={fetchMetrics}
          className="fixed bottom-8 right-8 bg-zinc-800 hover:bg-zinc-700 text-white p-4 rounded-full shadow-2xl border border-zinc-700 transition-all flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-zinc-500"
          aria-label="Refrescar métricas"
        >
          <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin text-cyan-400' : 'text-zinc-300'}`} />
        </button>
      </div>
    </div>
  );
}