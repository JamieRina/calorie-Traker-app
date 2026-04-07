import biteBalanceLogo from "@/assets/Bite_Balance_Logo.png";


export default function AppLogo() {
  return (
    <div className="inline-flex items-center gap-3">
      <img
        src={biteBalanceLogo}
        alt="Bite Balance logo"
        className="h-12 w-12 rounded-2xl object-contain"
      />
      <div>
        <p className="display-font text-lg font-bold tracking-tight text-foreground">Bite Balance</p>
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary/60">Simple tracking</p>
      </div>
    </div>
  );
}
