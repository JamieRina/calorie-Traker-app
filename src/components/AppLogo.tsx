export default function AppLogo() {
  return (
    <div className="inline-flex items-center gap-2.5">
      <img
        src="/bitebalance-logo.svg"
        alt="BiteBalance logo"
        className="h-10 w-10 rounded-[15px] border border-primary/20 object-cover shadow-[var(--shadow-button)]"
      />
      <div>
        <p className="display-font text-base font-bold text-foreground">BiteBalance</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/60">Nutrition</p>
      </div>
    </div>
  );
}
