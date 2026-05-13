import { ArrowLeft, SearchX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppPage, SectionCard } from "@/components/app/AppPage";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <AppPage>
      <SectionCard variant="hero" eyebrow="404" title="Page not found" description="That screen is not available in this version of BiteBalance.">
        <div className="flex items-center gap-4 rounded-[22px] border border-border/70 bg-card/70 p-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <SearchX className="h-5 w-5" />
          </div>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-2xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-button)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back home
          </button>
        </div>
      </SectionCard>
    </AppPage>
  );
};

export default NotFound;
