import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ContentLayout from "@/components/ContentLayout";
import { models } from "@/data/models";

const categories = ["All", "Latina", "Asian", "Blonde", "Couples", "Trans", "MILF"];

const ModelListing = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeCategory = searchParams.get("category") || "All";
  const onlineCount = models.filter((m) => m.online).length;

  const filteredModels =
    activeCategory === "All"
      ? models
      : models.filter((m) =>
          m.tags.some((t) => t.toLowerCase() === activeCategory.toLowerCase())
        );

  const handleCategory = (cat: string) => {
    if (cat === "All") {
      setSearchParams({});
    } else {
      setSearchParams({ category: cat.toLowerCase() });
    }
  };

  return (
    <ContentLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-[28px] font-bold text-foreground mb-1">Live Cam Models</h1>
          <p className="text-sm text-[hsl(var(--text-secondary))] mb-2">
            Discover performers streaming live right now
          </p>
          <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--text-secondary))]">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse-live" />
            <span className="tabular-nums">{onlineCount} models online now</span>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex gap-2 overflow-x-auto pb-4 mb-6 -mx-4 px-4 scrollbar-hide">
          {categories.map((cat) => {
            const isActive =
              cat === "All"
                ? activeCategory === "All"
                : activeCategory.toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                onClick={() => handleCategory(cat)}
                className={`btn-press flex-shrink-0 h-8 px-4 rounded-full text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "bg-foreground/[0.15] text-[hsl(var(--text-secondary))] hover:bg-foreground/[0.25]"
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Model Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {filteredModels.map((model) => (
            <Link
              key={model.id}
              to={`/models/${model.slug}`}
              className="group"
            >
              <div
                className="aspect-square rounded-2xl relative overflow-hidden transition-transform group-hover:scale-[1.03]"
                style={{ background: model.gradient }}
              >
                {model.online && (
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-success/20 border border-success/40 rounded-full px-2 py-0.5 z-10">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-live" />
                    <span className="text-[9px] font-bold text-success">LIVE</span>
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 gradient-bottom p-3">
                  <p className="text-sm font-bold text-foreground text-overlay">{model.name}</p>
                  <p className="text-[10px] text-[hsl(var(--text-tertiary))]">{model.tags[0]}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Load More */}
        <div className="flex justify-center mt-8">
          <button className="btn-press h-11 px-8 rounded-full bg-foreground/[0.15] text-foreground text-sm font-medium hover:bg-foreground/[0.25] transition-colors">
            Load More
          </button>
        </div>
      </div>
    </ContentLayout>
  );
};

export default ModelListing;
