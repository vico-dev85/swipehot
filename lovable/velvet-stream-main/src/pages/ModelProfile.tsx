import { useParams, Link } from "react-router-dom";
import { BadgeCheck, Eye, Heart, Star, Clock } from "lucide-react";
import ContentLayout from "@/components/ContentLayout";
import { models } from "@/data/models";

const ModelProfile = () => {
  const { slug } = useParams();
  const model = models.find((m) => m.slug === slug);
  const relatedModels = models.filter((m) => m.slug !== slug).slice(0, 6);
  const sidebarModels = models.filter((m) => m.online && m.slug !== slug).slice(0, 5);

  if (!model) {
    return (
      <ContentLayout>
        <div className="flex items-center justify-center min-h-[60vh] text-[hsl(var(--text-secondary))]">
          Model not found
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      {/* Hero */}
      <div className="relative w-full h-[50vh] lg:h-[60vh] overflow-hidden">
        {/* Desktop: two-column hero */}
        <div className="absolute inset-0 lg:flex">
          {/* Video/placeholder area */}
          <div
            className="w-full lg:w-[60%] h-full relative"
            style={{ background: model.gradient }}
          >
            {model.online ? (
              <>
                <div className="absolute inset-0 opacity-10">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-foreground/5 to-transparent animate-shimmer" />
                </div>
                <div className="absolute top-4 right-4 flex items-center gap-1.5 bg-success/20 border border-success/40 rounded-full px-3 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-success animate-pulse-live" />
                  <span className="text-xs font-bold text-success">LIVE NOW</span>
                </div>
              </>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center" style={{ filter: "saturate(0.3) brightness(0.5)" }}>
                <div className="text-center">
                  <div className="w-20 h-20 rounded-full bg-[hsl(var(--bg-elevated))] mx-auto mb-3 flex items-center justify-center text-2xl font-bold text-[hsl(var(--text-tertiary))]">
                    {model.name[0]}
                  </div>
                  <span className="text-sm text-[hsl(var(--text-tertiary))]">Currently Offline</span>
                </div>
              </div>
            )}
          </div>

          {/* Desktop info column */}
          <div className="hidden lg:flex lg:w-[40%] flex-col justify-end p-8 bg-[hsl(var(--bg-tinted))]">
            <div className="flex items-center gap-2 mb-2">
              <h1 className="text-2xl font-bold text-foreground">{model.name}</h1>
              {model.verified && <BadgeCheck size={20} className="text-primary fill-primary/20" />}
              {model.online && (
                <span className="text-[10px] font-bold text-success bg-success/15 rounded-full px-2 py-0.5">LIVE</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-4">
              {model.tags.map((tag) => (
                <span key={tag} className="text-[10px] border border-primary/40 text-primary rounded-full px-2.5 py-0.5">
                  {tag}
                </span>
              ))}
            </div>
            <Link
              to={model.online ? "#" : "/"}
              className="btn-press w-full h-14 rounded-full bg-primary text-primary-foreground font-bold text-base flex items-center justify-center glow-primary"
            >
              {model.online ? "Watch Her Live →" : "Watch Random Live →"}
            </Link>
          </div>
        </div>

        {/* Mobile overlay */}
        <div className="lg:hidden absolute bottom-0 left-0 right-0 gradient-bottom p-4 pb-20">
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold text-foreground text-overlay">{model.name}</h1>
            {model.verified && <BadgeCheck size={18} className="text-primary fill-primary/20" />}
            {model.online && (
              <span className="text-[10px] font-bold text-success bg-success/15 rounded-full px-2 py-0.5">LIVE</span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {model.tags.map((tag) => (
              <span key={tag} className="text-[10px] border border-primary/40 text-primary rounded-full px-2.5 py-0.5">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* Mobile CTA */}
        <div className="lg:hidden absolute bottom-0 left-0 right-0 flex justify-center pb-4 px-4">
          <Link
            to={model.online ? "#" : "/"}
            className="btn-press w-full max-w-md h-14 rounded-full bg-primary text-primary-foreground font-bold text-base flex items-center justify-center glow-primary"
          >
            {model.online ? "Watch Her Live →" : "Watch Random Live →"}
          </Link>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="mx-4 lg:mx-auto lg:max-w-5xl -mt-2 relative z-10 mb-8">
        <div className="glass rounded-2xl p-4 grid grid-cols-4 gap-2">
          {[
            { icon: Eye, value: model.viewers.toLocaleString(), label: "viewers" },
            { icon: Heart, value: model.likes, label: "likes" },
            { icon: Star, value: model.rating.toString(), label: "rating" },
            { icon: Clock, value: model.lastOnline, label: model.online ? "status" : "last online" },
          ].map((stat) => (
            <div key={stat.label} className="flex flex-col items-center text-center gap-0.5">
              <stat.icon size={16} className="text-[hsl(var(--text-tertiary))]" />
              <span className="text-sm font-bold text-foreground tabular-nums">{stat.value}</span>
              <span className="text-[10px] text-[hsl(var(--text-tertiary))]">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:max-w-5xl lg:mx-auto lg:flex lg:gap-8 px-4">
        <div className="flex-1 min-w-0">
          {/* About */}
          <section className="mb-10 max-w-3xl">
            <h2 className="text-xl font-bold text-foreground mb-4">About {model.name}</h2>
            {model.longBio.split("\n\n").map((p, i) => (
              <p key={i} className="text-[15px] text-[hsl(var(--text-secondary))] leading-[1.7] mb-4">{p}</p>
            ))}
          </section>

          {/* Tags */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-foreground mb-4">Categories & Tags</h2>
            <div className="flex flex-wrap gap-2">
              {model.tags.map((tag) => (
                <a
                  key={tag}
                  href="#"
                  className="text-xs border border-[hsl(var(--text-tertiary))] text-[hsl(var(--text-secondary))] rounded-xl h-8 px-4 flex items-center hover:border-primary hover:text-primary transition-colors"
                >
                  {tag}
                </a>
              ))}
            </div>
          </section>

          {/* Related Models */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-foreground mb-4">Similar Models You'll Love</h2>
            <div className="flex gap-3 overflow-x-auto pb-2 lg:grid lg:grid-cols-3 lg:overflow-visible">
              {relatedModels.map((m) => (
                <Link
                  key={m.id}
                  to={`/models/${m.slug}`}
                  className="flex-shrink-0 w-[140px] lg:w-auto group"
                >
                  <div
                    className="aspect-square rounded-2xl relative overflow-hidden transition-transform group-hover:scale-[1.03]"
                    style={{ background: m.gradient }}
                  >
                    {m.online && (
                      <div className="absolute top-2 right-2 flex items-center gap-1 bg-success/20 rounded-full px-1.5 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-live" />
                        <span className="text-[9px] font-bold text-success">LIVE</span>
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 gradient-bottom p-2.5">
                      <p className="text-[13px] font-bold text-foreground text-overlay">{m.name}</p>
                      <p className="text-[11px] text-[hsl(var(--text-tertiary))]">{m.tags[0]}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Schedule */}
          <section className="mb-10">
            <h2 className="text-xl font-bold text-foreground mb-4">When She's Usually Online</h2>
            <div className="grid grid-cols-7 gap-2">
              {model.schedule.map((s) => (
                <div key={s.day} className="text-center">
                  <span className="text-[11px] text-[hsl(var(--text-tertiary))] block mb-1.5">{s.day}</span>
                  <div
                    className={`h-16 rounded-xl ${
                      s.active
                        ? "bg-primary/20 border border-primary/30"
                        : "bg-[hsl(var(--bg-elevated))] border border-[hsl(var(--border))]"
                    }`}
                  >
                    {s.active && (
                      <div className="h-full flex items-center justify-center">
                        <span className="text-[9px] font-medium text-primary">Eve</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="mb-10">
            <div className="rounded-2xl p-6 text-center" style={{ background: "linear-gradient(135deg, hsl(348 99% 58% / 0.1), hsl(186 100% 50% / 0.05))" }}>
              <p className="text-lg font-bold text-foreground mb-2">Don't miss her next show</p>
              <Link
                to={model.online ? "#" : "/models"}
                className="btn-press inline-flex h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm px-8 items-center glow-primary"
              >
                {model.online ? "Watch Live Now →" : "Explore More Models →"}
              </Link>
            </div>
          </section>
        </div>

        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-[280px] flex-shrink-0">
          <div className="sticky top-20 space-y-4">
            <div className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">More Live Models</h3>
              <div className="space-y-3">
                {sidebarModels.map((m) => (
                  <Link
                    key={m.id}
                    to={`/models/${m.slug}`}
                    className="flex items-center gap-3 group"
                  >
                    <div
                      className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-foreground"
                      style={{ background: m.gradient }}
                    >
                      {m.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{m.name}</p>
                      <p className="text-[11px] text-[hsl(var(--text-tertiary))]">{m.tags[0]}</p>
                    </div>
                    {m.online && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-live" />
                        <span className="text-[10px] font-bold text-success">LIVE</span>
                      </span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </ContentLayout>
  );
};

export default ModelProfile;
