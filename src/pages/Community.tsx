import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppPage, PageHeader, SectionCard } from "@/components/app/AppPage";
import { getCommunityFeed } from "@/lib/api";

export default function Community() {
  const navigate = useNavigate();
  const feedQuery = useQuery({
    queryKey: ["community-feed"],
    queryFn: getCommunityFeed,
  });

  const feed = feedQuery.data;

  return (
    <AppPage>
      <PageHeader
        eyebrow="Coach"
        title="Guidance"
        action={
          <button
            onClick={() => navigate(-1)}
            className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/80 bg-card/90 shadow-[var(--shadow-card)]"
            aria-label="Go back"
          >
            <ArrowLeft className="h-4 w-4 text-foreground" />
          </button>
        }
      />

      <SectionCard eyebrow="Featured" title={feedQuery.isLoading ? "Loading" : "Start here"}>
        <div className="space-y-2.5">
          {(feed?.featured ?? []).map((item) => (
            <article key={item.id} className="rounded-[20px] bg-surface-elevated/35 p-3.5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/60">{item.contentType}</p>
                  <h2 className="mt-2 text-base font-bold text-foreground">{item.title}</h2>
                </div>
                <span className="rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">{item.authorName}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{item.summary}</p>
            </article>
          ))}

          {feedQuery.isError ? (
            <div className="rounded-[22px] border border-destructive/25 bg-destructive/10 px-4 py-4 text-sm text-destructive">
              {feedQuery.error instanceof Error ? feedQuery.error.message : "Community content is unavailable right now."}
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard eyebrow="Challenges" title="Weekly focus">
        <div className="space-y-2.5">
          {(feed?.challenges ?? []).map((challenge) => (
            <article key={challenge.id} className="rounded-[20px] bg-card/80 p-3.5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-button)]">
                  <Trophy className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground">{challenge.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{challenge.description}</p>
                </div>
              </div>
            </article>
          ))}

          {feed && feed.challenges.length === 0 ? (
            <div className="rounded-[22px] border border-dashed border-primary/25 bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
              No active challenges yet.
            </div>
          ) : null}
        </div>
      </SectionCard>
    </AppPage>
  );
}
