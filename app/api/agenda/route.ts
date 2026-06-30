import { NextResponse } from 'next/server';
import ical from 'node-ical';

export const dynamic = 'force-dynamic'; // Evita que Vercel congele la respuesta

export async function GET() {
  try {
    // 🚨 PEGA TU ENLACE SECRETO AQUÍ 🚨
    const ICAL_URL = "https://calendar.google.com/calendar/ical/56588acfec2995cf53a59cf669888c6bb229929f1c1b527a1a379cbaf92f85c4%40group.calendar.google.com/private-5dd46b96806aad6e000d19409c7fd30f/basic.ics"; 
    
    const data = await ical.async.fromURL(ICAL_URL);
    const events: any[] = [];
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Filtrar y procesar los eventos
    for (const k in data) {
      const event = data[k];
      if (event?.type === 'VEVENT' && event.start) {
        const eventDate = new Date(event.start as Date);
        
        // Calculamos cuántos días faltan
        const diffTime = eventDate.getTime() - startOfDay.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);
        
        // Traer turnos desde hoy hasta los próximos 7 días
        if (diffDays >= 0 && diffDays <= 7) {
          events.push({
            id: event.uid,
            title: event.summary,
            date: eventDate,
          });
        }
      }
    }

    // Ordenar cronológicamente (el más próximo arriba)
    events.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Formatear para que la interfaz lo muestre perfecto
    const formattedEvents = events.map(e => {
        const d = e.date as Date;
        return {
            id: e.id,
            title: e.title,
            time: d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Mendoza' }),
            day: d.toLocaleDateString('es-AR', { weekday: 'short', day: 'numeric', timeZone: 'America/Argentina/Mendoza' })
        }
    });

    return NextResponse.json(formattedEvents);
  } catch (error) {
    console.error("Error al leer iCal:", error);
    return NextResponse.json({ error: "Error cargando calendario" }, { status: 500 });
  }
}