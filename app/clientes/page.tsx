import NavBar from '../components/NavBar';
import SessionsMonitor from '../components/SessionsMonitor';
import { Ban } from 'lucide-react';

export default function ClientesPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-8 font-sans selection:bg-cyan-500/30 pb-24">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Clientes</h1>
          <p className="text-zinc-400 mt-2 text-sm">Monitoreo de sesiones y lista negra</p>
        </header>

        <NavBar />

        <div className="flex flex-col gap-10">
          <section className="w-full">
            <SessionsMonitor />
          </section>

          <section className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 shadow-xl shadow-black/50 w-full flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <Ban className="w-6 h-6 text-red-500" />
              <h2 className="text-xl font-medium text-zinc-200 tracking-wide">Lista Negra</h2>
            </div>
            
            <p className="text-sm text-zinc-400">
              Aquí puedes ver y gestionar los números de teléfono bloqueados que el bot debe ignorar.
            </p>
            
            <div className="w-full h-[600px] rounded-xl overflow-hidden border border-zinc-800">
              <iframe 
                src="https://docs.google.com/spreadsheets/d/16qQNcCneRA-4Q9y8mdp2puXs-UWgHGvieB18AlzKGgw/edit?rm=minimal" 
                width="100%" 
                height="100%" 
                style={{ border: 'none' }}
                title="Lista Negra Sheets"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
