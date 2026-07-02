This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Turnos y Calendario (actualizado)

Los turnos reales se leen **directo de Google Calendar** (el mismo calendario que usa el bot de
WhatsApp para agendar, modificar y cancelar), no de la tabla `lavadero_turnos` de Supabase. Esa
tabla registra cada conversación cerrada del bot con `estado: "finalizado"` sin importar el
resultado, por lo que no sirve como contador de turnos reales.

- `lib/ics.ts`: parser de iCal compartido.
- `app/api/agenda/route.ts`: próximos 7 días (usado en el panel "Próximos Turnos").
- `app/api/calendario/route.ts?year=&month=`: turnos de un mes completo (usado en `/calendario`
  y para calcular el KPI "Turnos Agendados" y el gráfico mensual).

### Variable de entorno nueva

Agregar en Vercel (Project Settings → Environment Variables) y en `.env.local` para desarrollo:

```
CALENDAR_ICAL_URL=https://calendar.google.com/calendar/ical/.../basic.ics
```

Es la "Dirección secreta en formato iCal" del calendario "Atencia Garage"
(Ajustes de Google Calendar → Integrar calendario). Antes estaba hardcodeada en el código fuente;
ahora es privada (no lleva `NEXT_PUBLIC_`, así que solo se usa en el servidor).
