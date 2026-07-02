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
    const now = new Date();
    const year = parseInt(searchParams.get('year') || '') || now.getFullYear();
    const monthParam = parseInt(searchParams.get('month') || '') || (now.getMonth() + 1);
    const month = Math.min(Math.max(monthParam, 1), 12);

    const events = await fetchCalendarEvents(getIcalUrl());

    const startOfMonth = new Date(year, month - 1, 1);
    const startOfNextMonth = new Date(year, month, 1);

    const eventsInMonth = events.filter(e => e.start >= startOfMonth && e.start < startOfNextMonth);
    eventsInMonth.sort((a, b) => a.start.getTime() - b.start.getTime());

    const formatted = eventsInMonth.map(e => ({
      id: e.id,
      title: e.title,
      description: e.description,
      start: e.start.toISOString(),
      end: e.end ? e.end.toISOString() : null,
      // dateKey en horario Mendoza para agrupar por dia en el front sin desfasajes de zona horaria
      dateKey: e.start.toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Mendoza' }), // YYYY-MM-DD
      time: e.start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Mendoza' }),
    }));

    return NextResponse.json({ year, month, events: formatted });
  } catch (error) {
    console.error('Error al procesar calendario mensual:', error);
    return NextResponse.json({ error: 'Error cargando calendario' }, { status: 500 });
  }
}
