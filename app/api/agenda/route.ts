import { NextResponse } from 'next/server';
import { fetchCalendarEvents, getIcalUrl } from '@/lib/ics';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const events = await fetchCalendarEvents(getIcalUrl());

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Solo los turnos desde hoy hasta 7 dias en el futuro.
    const upcomingEvents = events.filter(e => {
      const diffDays = (e.start.getTime() - startOfDay.getTime()) / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    });

    upcomingEvents.sort((a, b) => a.start.getTime() - b.start.getTime());

    const formattedEvents = upcomingEvents.map(e => ({
      id: e.id,
      title: e.title,
      time: e.start.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Mendoza' }),
      day: e.start.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', timeZone: 'America/Argentina/Mendoza' }),
    }));

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error('Error al procesar calendario:', error);
    return NextResponse.json({ error: 'Error cargando agenda' }, { status: 500 });
  }
}
