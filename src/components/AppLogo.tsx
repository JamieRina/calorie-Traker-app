export default function AppLogo() {
  return (
    <div className="inline-flex items-center gap-2.5">
      <img
        src="/BiteBalanceLogo.png"
        alt="BiteBalance logo"
        className="h-12 w-12 rounded-[17px] object-contain shadow-[var(--shadow-button)]"
      />
      <div>
        <p className="display-font text-base font-bold text-foreground">BiteBalance</p>
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/60">Calories</p>
      </div>
    </div>
  );
}
