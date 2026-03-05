import { FlaskConical } from 'lucide-react';

export default function LabLoader({ text = "Loading Data" }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="relative flex h-28 w-28 items-center justify-center rounded-[2rem] bg-white/40 shadow-2xl backdrop-blur-xl border border-slate-200/50 dark:bg-slate-800/40 dark:border-slate-700/50">
                {/* Background ambient glow */}
                <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-tr from-indigo-500/20 via-emerald-500/10 to-transparent blur-xl animate-pulse" />

                {/* Bouncing Flask icon */}
                <div className="relative z-10 flex flex-col items-center justify-center animate-bounce">
                    <FlaskConical className="h-12 w-12 text-indigo-600 dark:text-indigo-400 drop-shadow-md" strokeWidth={1.5} />
                    {/* Simulated glowing liquid inside flask */}
                    <div className="absolute bottom-1 w-6 h-4 bg-emerald-400/80 rounded-b-md blur-[3px]" />
                </div>

                {/* Floating chemistry bubbles effect */}
                <div className="absolute -top-6 left-1/2 h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)] animate-[ping_1.5s_ease-in-out_infinite] delay-75 z-20" />
                <div className="absolute -top-3 left-1/4 h-1.5 w-1.5 rounded-full bg-indigo-400 shadow-[0_0_8px_rgba(129,140,248,0.8)] animate-[ping_2s_ease-in-out_infinite] delay-150 z-20" />
                <div className="absolute top-2 -right-4 h-2 w-2 rounded-full bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.8)] animate-[ping_1.8s_ease-in-out_infinite] delay-300 z-20" />
            </div>

            <div className="text-center space-y-3 relative z-10">
                <h3 className="text-xs font-black uppercase tracking-[0.3em] text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-emerald-600 dark:from-indigo-400 dark:to-emerald-400 animate-pulse">
                    {text}
                </h3>
                {/* Colored bouncing dots */}
                <div className="flex justify-center items-center gap-1.5 mt-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-bounce [animation-delay:-0.15s]" />
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-bounce" />
                </div>
            </div>
        </div>
    );
}
