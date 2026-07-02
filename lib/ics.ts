// lib/ics.ts
// Parser de iCal (Google Calendar) compartido por las rutas /api/agenda y /api/calendario.
// El Google Calendar es la fuente de verdad de los turnos: el bot de WhatsApp crea, modifica
// y borra eventos ahi directamente (Calendar_Agendar / Calendar_Gestionar / Calendar_Borrar en n8n),
// asi que leer el feed siempre refleja el estado real (incluye cancelaciones y modificaciones).

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  start: Date;
  end: Date | null;
}

// Google Calendar puede "foldear" (partir en varias lineas) las lineas largas del .ics,
// marcando la continuacion con un espacio o tab al inicio de la linea siguiente.
// Si no se "desfoldea" antes de parsear, titulos/descripciones largas se cortan mal.
function unfold(icsText: string): string[] {
  const rawLines = icsText.split(/\r?\n/);
  const lines: string[] = [];
  for (const line of rawLines) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && lines.length > 0) {
      lines[lines.length - 1] += line.slice(1);
    } else {
      lines.push(line);
    }
  }
  return lines;
}

// Convierte un valor de fecha ICS (ej: 20260630T100000Z o 20260630T100000) a Date,
// forzando America/Argentina/Mendoza (-03:00) cuando no viene en UTC.
function parseIcsDate(dateStr: string): Date | null {
  if (!dateStr || dateStr.length < 8) return null;
  const y = dateStr.slice(0, 4);
  const m = dateStr.slice(4, 6);
  const d = dateStr.slice(6, 8);
  let h = '00', min = '00', s = '00';
  const isUTC = dateStr.endsWith('Z');

  if (dateStr.includes('T')) {
    const timePart = dateStr.split('T')[1];
    h = timePart.slice(0, 2) || '00';
    min = timePart.slice(2, 4) || '00';
    s = timePart.slice(4, 6) || '00';
  }

  const isoString = `${y}-${m}-${d}T${h}:${min}:${s}${isUTC ? 'Z' : '-03:00'}`;
  const parsed = new Date(isoString);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Un DESCRIPTION en ICS escapa \n, \, y comas. Los des-escapamos para mostrarlo prolijo.
function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

export async function fetchCalendarEvents(icalUrl: string): Promise<CalendarEvent[]> {
  const response = await fetch(icalUrl, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`No se pudo leer el calendario (status ${response.status})`);
  }
  const text = await response.text();
  const lines = unfold(text);

  const events: CalendarEvent[] = [];
  let current: Partial<CalendarEvent> & { _status?: string } | null = null;

  for (const line of lines) {
    if (line.startsWith('BEGIN:VEVENT')) {
      current = { title: '', description: '', end: null };
    } else if (!current) {
      continue;
    } else if (line.startsWith('SUMMARY:') || line.startsWith('SUMMARY;')) {
      const value = line.slice(line.indexOf(':') + 1).trim();
      current.title = unescapeIcsText(value);
    } else if (line.startsWith('DESCRIPTION:') || line.startsWith('DESCRIPTION;')) {
      const value = line.slice(line.indexOf(':') + 1).trim();
      current.description = unescapeIcsText(value);
    } else if (line.startsWith('STATUS:')) {
      current._status = line.slice(line.indexOf(':') + 1).trim().toUpperCase();
    } else if (line.startsWith('DTSTART')) {
      const value = line.slice(line.indexOf(':') + 1).trim();
      const parsed = parseIcsDate(value);
      if (parsed) current.start = parsed;
    } else if (line.startsWith('DTEND')) {
      const value = line.slice(line.indexOf(':') + 1).trim();
      current.end = parseIcsDate(value);
    } else if (line.startsWith('UID:')) {
      current.id = line.slice(4).trim();
    } else if (line.startsWith('END:VEVENT')) {
      // Un evento CANCELLED sigue estando en el feed de Google segun el rango de fechas,
      // asi que lo filtramos explicitamente para que un turno cancelado no cuente.
      if (current.title && current.start && current._status !== 'CANCELLED') {
        events.push({
          id: current.id || `${current.title}-${current.start.toISOString()}`,
          title: current.title,
          description: current.description || '',
          start: current.start,
          end: current.end || null,
        });
      }
      current = null;
    }
  }

  return events;
}

export function getIcalUrl(): string {
  const url = process.env.CALENDAR_ICAL_URL;
  if (!url) {
    throw new Error('Falta configurar la variable de entorno CALENDAR_ICAL_URL');
  }
  return url;
}
