import { NextRequest, NextResponse } from 'next/server';
import { fetchCalendarEvents, getIcalUrl } from '@/lib/ics';

export const dynamic = 'force-dynamic';

// GET /api/calendario?year=2026&month=7  (month es 1-12)
// Sin parametros, devuelve el mes actual.
// Devuelve los turnos reales tomados directo de Google Calendar, que ya refleja
// altas, modificaciones y cancelaciones hechas por el bot.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const startIso = searchParams.get('start');
    const endIso = searchParams.get('end');
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month');

    const now = new Date();
    const events = await fetchCalendarEvents(getIcalUrl());

    let startDate: Date;
    let endDate: Date;
    let year = now.getFullYear();
    let month = now.getMonth() + 1;

    if (startIso && endIso) {
      startDate = new Date(startIso);
      endDate = new Date(endIso);
    } else {
      year = parseInt(yearParam || '') || now.getFullYear();
      const m = parseInt(monthParam || '') || (now.getMonth() + 1);
      month = Math.min(Math.max(m, 1), 12);
      startDate = new Date(year, month - 1, 1);
      endDate = new Date(year, month, 1);
    }

    const filteredEvents = events.filter(e => e.start >= startDate && e.start < endDate);
    filteredEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

    const formatted = filteredEvents.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      start: e.start.toISOString(),
      end: e.end ? e.end.toISOString() : null,
      // dateKey en horario Mendoza para agrupar por dia en el front sin desfasajes de zona horaria
      dateKey: e.start.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Mendoza' }), // YYYY-MM-DD
      time: e.start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Mendoza' }),
    }));

    return NextResponse.json({ 
      ...(startIso && endIso ? { start: startIso, end: endIso } : { year, month }), 
      events: formatted 
    });
  } catch (error) {
    console.error('Error al procesar calendario:', error);
    return NextResponse.json({ error: 'Error cargando calendario' }, { status: 500 });
  }
}
