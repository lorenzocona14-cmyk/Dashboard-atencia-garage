import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 🚨 PEGA TU ENLACE SECRETO DE GOOGLE CALENDAR AQUÍ 🚨
    const ICAL_URL = "https://calendar.google.com/calendar/ical/56588acfec2995cf53a59cf669888c6bb229929f1c1b527a1a379cbaf92f85c4%40group.calendar.google.com/private-5dd46b96806aad6e000d19409c7fd30f/basic.ics"; 
    
    // Usamos el fetch nativo, sin librerías externas
    const response = await fetch(ICAL_URL, { cache: 'no-store' });
    const text = await response.text();

    const events: any[] = [];
    const lines = text.split(/\r?\n/);
    let currentEvent: any = null;

    // Leemos el archivo línea por línea
    for (let line of lines) {
      if (line.startsWith('BEGIN:VEVENT')) {
        currentEvent = {};
      } else if (line.startsWith('SUMMARY:') && currentEvent) {
        currentEvent.title = line.substring(8).trim();
      } else if (line.startsWith('DTSTART') && currentEvent) {
        // Extraemos la fecha (Ej: DTSTART:20260630T100000Z)
        const dateStr = line.split(':')[1];
        if (dateStr && dateStr.length >= 8) {
          const y = dateStr.slice(0, 4);
          const m = dateStr.slice(4, 6);
          const d = dateStr.slice(6, 8);
          let h = '00', min = '00', s = '00';
          let isUTC = dateStr.endsWith('Z');

          if (dateStr.includes('T')) {
            const timePart = dateStr.split('T')[1];
            h = timePart.slice(0, 2);
            min = timePart.slice(2, 4);
            s = timePart.slice(4, 6);
          }

          // Armamos la fecha forzando la zona horaria local (-03:00) si no es UTC
          const isoString = `${y}-${m}-${d}T${h}:${min}:${s}${isUTC ? 'Z' : '-03:00'}`;
          currentEvent.date = new Date(isoString);
        }
      } else if (line.startsWith('UID:') && currentEvent) {
        currentEvent.id = line.substring(4).trim();
      } else if (line.startsWith('END:VEVENT') && currentEvent) {
        if (currentEvent.title && currentEvent.date) {
          events.push(currentEvent);
        }
        currentEvent = null;
      }
    }

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Filtramos solo los turnos que ocurren desde hoy hasta 7 días en el futuro
    const upcomingEvents = events.filter(e => {
      const diffTime = e.date.getTime() - startOfDay.getTime();
      const diffDays = diffTime / (1000 * 3600 * 24);
      return diffDays >= 0 && diffDays <= 7;
    });

    // Ordenamos cronológicamente
    upcomingEvents.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Formateamos para que el Dashboard lo muestre impecable
    const formattedEvents = upcomingEvents.map(e => ({
      id: e.id,
      title: e.title,
      time: e.date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Mendoza' }),
      day: e.date.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', timeZone: 'America/Argentina/Mendoza' })
    }));

    return NextResponse.json(formattedEvents);

  } catch (error) {
    console.error("Error al procesar calendario:", error);
    return NextResponse.json({ error: "Error cargando agenda" }, { status: 500 });
  }
}