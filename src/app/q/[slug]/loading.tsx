export default function QueueLoading() {
  return (
    <div className="min-h-[100dvh] bg-slate-950 p-4 flex flex-col items-center gap-4 animate-pulse">
      <div className="w-20 h-20 rounded-2xl bg-white/10" />
      <div className="w-48 h-6 rounded-full bg-white/10" />
      <div className="w-full max-w-md h-64 bg-slate-900 rounded-3xl border border-white/5" />
      <div className="w-full max-w-md h-24 bg-slate-900 rounded-2xl border border-white/5" />
    </div>
  );
}
