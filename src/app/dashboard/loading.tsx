export default function DashboardLoading() {
  return (
    <div className="flex flex-col w-full p-4 sm:p-6 md:p-8 gap-6 animate-pulse">
      <div className="h-8 w-48 bg-white/10 rounded-xl" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i=>(
          <div key={i} className="h-32 bg-[#111827] border border-white/5 rounded-2xl" />
        ))}
      </div>
      <div className="h-64 bg-[#111827] border border-white/5 rounded-2xl" />
    </div>
  );
}
