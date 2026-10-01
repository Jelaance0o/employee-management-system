function StatCard({ title, value, description }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0b0c0f] p-5">
      <p className="text-sm text-white/50">{title}</p>

      <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
        {value}
      </h2>

      <p className="mt-2 text-xs text-white/40">{description}</p>
    </div>
  );
}

export default StatCard;
