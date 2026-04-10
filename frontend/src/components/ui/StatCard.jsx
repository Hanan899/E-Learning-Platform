function StatCard({ icon: Icon, title, value, toneClass = 'bg-primary/10 text-primary', suffix }) {
  return (
    <article
      className="card flex items-start gap-4 p-5 transition-all hover:-translate-y-1"
      data-testid="student-stat-card"
    >
      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${toneClass}`}>
        {Icon ? <Icon className="text-2xl" /> : null}
      </div>
      <div>
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <p className="mt-2 text-3xl font-bold text-slate-950">
          {value}
          {suffix ? <span className="ml-1 text-xl text-slate-400">{suffix}</span> : null}
        </p>
      </div>
    </article>
  );
}

export default StatCard;
