import { Link } from "react-router-dom";
import ContentLayout from "@/components/ContentLayout";
import { blogPosts } from "@/data/blog-posts";
import { models } from "@/data/models";

const popularTags = [
  { label: "latina", size: "text-sm", opacity: "opacity-100" },
  { label: "lovense", size: "text-xs", opacity: "opacity-80" },
  { label: "couples", size: "text-sm", opacity: "opacity-90" },
  { label: "asian", size: "text-xs", opacity: "opacity-70" },
  { label: "blonde", size: "text-sm", opacity: "opacity-85" },
  { label: "milf", size: "text-xs", opacity: "opacity-75" },
  { label: "squirt", size: "text-xs", opacity: "opacity-65" },
  { label: "trans", size: "text-sm", opacity: "opacity-80" },
  { label: "petite", size: "text-xs", opacity: "opacity-70" },
  { label: "bigboobs", size: "text-xs", opacity: "opacity-60" },
];

const BlogListing = () => {
  const trendingModels = models.filter((m) => m.online).slice(0, 5);

  return (
    <ContentLayout>
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-bold text-foreground mb-1">xcam.vip Blog</h1>
          <p className="text-sm text-[hsl(var(--text-secondary))]">
            Tips, guides, and the latest from the world of live cam entertainment
          </p>
        </div>

        <div className="lg:flex lg:gap-8">
          {/* Article Grid */}
          <div className="flex-1 min-w-0">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {blogPosts.map((post) => (
                <Link
                  key={post.id}
                  to={`/blog/${post.slug}`}
                  className="group bg-card rounded-2xl overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all"
                >
                  <div
                    className="h-[150px] relative"
                    style={{
                      background: "linear-gradient(135deg, hsl(348 99% 58% / 0.12), hsl(186 100% 50% / 0.08), hsl(var(--bg-tinted)))",
                    }}
                  >
                    <span className="absolute top-3 left-3 glass rounded-full px-2.5 py-0.5 text-[10px] font-medium text-[hsl(var(--text-secondary))]">
                      {post.category}
                    </span>
                  </div>
                  <div className="p-4">
                    <h2 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1.5">
                      {post.title}
                    </h2>
                    <p className="text-[13px] text-[hsl(var(--text-secondary))] line-clamp-2 mb-3">
                      {post.excerpt}
                    </p>
                    <p className="text-[11px] text-[hsl(var(--text-tertiary))]">
                      {post.date} • {post.readTime}
                    </p>
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

          {/* Desktop Sidebar */}
          <aside className="hidden lg:block w-[280px] flex-shrink-0">
            <div className="sticky top-20 space-y-4">
              {/* Trending Now */}
              <div className="glass rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Trending Now</h3>
                <div className="space-y-3">
                  {trendingModels.map((m) => (
                    <Link key={m.id} to={`/models/${m.slug}`} className="flex items-center gap-3 group">
                      <div
                        className="w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-bold text-foreground"
                        style={{ background: m.gradient }}
                      >
                        {m.name[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors truncate">{m.name}</p>
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

              {/* Popular Tags */}
              <div className="glass rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-foreground mb-3">Popular Tags</h3>
                <div className="flex flex-wrap gap-1.5">
                  {popularTags.map((tag) => (
                    <Link
                      key={tag.label}
                      to={`/models?category=${tag.label}`}
                      className={`${tag.size} ${tag.opacity} bg-foreground/[0.08] hover:bg-primary/20 hover:text-primary text-[hsl(var(--text-secondary))] rounded-full px-2.5 py-1 transition-colors`}
                    >
                      {tag.label}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </ContentLayout>
  );
};

export default BlogListing;
