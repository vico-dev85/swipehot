import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ChevronDown, ChevronUp } from "lucide-react";
import ContentLayout from "@/components/ContentLayout";
import { blogPosts } from "@/data/blog-posts";
import { models } from "@/data/models";

const BlogPost = () => {
  const { slug } = useParams();
  const post = blogPosts.find((p) => p.slug === slug);
  const relatedPosts = blogPosts.filter((p) => p.slug !== slug).slice(0, 3);
  const sidebarModels = models.filter((m) => m.online).slice(0, 5);
  const [tocOpen, setTocOpen] = useState(false);

  // Extract headings from content for TOC
  const headings: { id: string; text: string }[] = [];
  if (post?.content) {
    const regex = /<h2 id="([^"]+)">([^<]+)<\/h2>/g;
    let match;
    while ((match = regex.exec(post.content)) !== null) {
      headings.push({ id: match[1], text: match[2] });
    }
  }

  // Inline model callout models
  const calloutModels = models.filter((m) => m.online).slice(0, 2);

  if (!post) {
    return (
      <ContentLayout>
        <div className="flex items-center justify-center min-h-[60vh] text-[hsl(var(--text-secondary))]">
          Article not found
        </div>
      </ContentLayout>
    );
  }

  return (
    <ContentLayout>
      {/* Hero */}
      <div className="relative w-full h-[40vh] lg:h-[50vh] overflow-hidden flex items-end">
        {/* Aurora gradient bg */}
        <div
          className="absolute inset-0 animate-gradient-shift"
          style={{
            background: "radial-gradient(ellipse at 30% 50%, hsla(348, 99%, 58%, 0.06) 0%, transparent 60%), radial-gradient(ellipse at 70% 40%, hsla(186, 100%, 50%, 0.05) 0%, transparent 60%), hsl(var(--bg-tinted))",
            backgroundSize: "200% 200%",
          }}
        />
        <div className="absolute bottom-0 left-0 right-0 h-1/2 gradient-bottom" />
        <div className="relative z-10 max-w-3xl mx-auto w-full px-4 pb-8 lg:pb-12">
          <span className="inline-block glass rounded-full px-3 py-1 text-[11px] font-medium text-[hsl(var(--text-secondary))] mb-3">
            {post.category}
          </span>
          <h1 className="text-[28px] lg:text-[36px] font-bold text-foreground leading-tight mb-3 text-overlay">
            {post.title}
          </h1>
          <p className="text-xs text-[hsl(var(--text-tertiary))]">
            By xcam.vip Team • {post.date} • {post.readTime}
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto lg:flex lg:gap-8 px-4">
        {/* Desktop left TOC */}
        {headings.length > 0 && (
          <aside className="hidden lg:block w-[200px] flex-shrink-0">
            <div className="sticky top-20">
              <h3 className="text-xs font-semibold text-[hsl(var(--text-tertiary))] uppercase tracking-wider mb-3">Contents</h3>
              <nav className="space-y-2">
                {headings.map((h) => (
                  <a
                    key={h.id}
                    href={`#${h.id}`}
                    className="block text-sm text-[hsl(var(--text-secondary))] hover:text-primary transition-colors"
                  >
                    {h.text}
                  </a>
                ))}
              </nav>
            </div>
          </aside>
        )}

        <div className="flex-1 min-w-0 max-w-3xl mx-auto lg:mx-0">
          {/* Mobile TOC */}
          {headings.length > 0 && (
            <div className="lg:hidden mb-6">
              <button
                onClick={() => setTocOpen(!tocOpen)}
                className="flex items-center gap-2 glass rounded-xl px-4 py-3 w-full text-sm font-medium text-foreground"
              >
                Table of Contents
                {tocOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </button>
              {tocOpen && (
                <nav className="glass rounded-xl mt-2 p-4 space-y-2">
                  {headings.map((h) => (
                    <a
                      key={h.id}
                      href={`#${h.id}`}
                      onClick={() => setTocOpen(false)}
                      className="block text-sm text-[hsl(var(--text-secondary))] hover:text-primary transition-colors"
                    >
                      {h.text}
                    </a>
                  ))}
                </nav>
              )}
            </div>
          )}

          {/* Article body */}
          {post.content ? (
            <article
              className="prose-xcam mb-12"
              dangerouslySetInnerHTML={{ __html: post.content }}
            />
          ) : (
            <div className="mb-12">
              <p className="text-[15px] text-[hsl(var(--text-secondary))] leading-[1.8]">{post.excerpt}</p>
              <p className="text-[15px] text-[hsl(var(--text-tertiary))] leading-[1.8] mt-4 italic">Full article content coming soon.</p>
            </div>
          )}

          {/* Inline model callouts */}
          <div className="space-y-4 mb-12">
            {calloutModels.map((m) => (
              <div key={m.id} className="bg-card rounded-2xl p-4 flex items-center gap-4">
                <div
                  className="w-[60px] h-[60px] rounded-full flex-shrink-0 flex items-center justify-center text-lg font-bold text-foreground"
                  style={{ background: m.gradient }}
                >
                  {m.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[15px] font-bold text-foreground">{m.name}</span>
                    {m.online && (
                      <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-live" />
                        <span className="text-[10px] font-bold text-success">LIVE</span>
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[hsl(var(--text-tertiary))]">{m.tags[0]}</p>
                  <Link to={`/models/${m.slug}`} className="text-xs font-medium text-secondary hover:underline mt-1 inline-block">
                    Watch Her Live →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Related Articles */}
          <section className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-4">More to Explore</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {relatedPosts.map((p) => (
                <Link
                  key={p.id}
                  to={`/blog/${p.slug}`}
                  className="group bg-card rounded-2xl overflow-hidden hover:-translate-y-0.5 hover:shadow-lg transition-all"
                >
                  <div
                    className="h-[100px] relative"
                    style={{ background: "linear-gradient(135deg, hsl(348 99% 58% / 0.15), hsl(186 100% 50% / 0.1))" }}
                  >
                    <span className="absolute top-3 left-3 glass rounded-full px-2.5 py-0.5 text-[10px] font-medium text-[hsl(var(--text-secondary))]">
                      {p.category}
                    </span>
                  </div>
                  <div className="p-4">
                    <h3 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors line-clamp-2 mb-1">
                      {p.title}
                    </h3>
                    <p className="text-[11px] text-[hsl(var(--text-tertiary))]">{p.date} • {p.readTime}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Bottom CTA */}
          <section className="mb-12">
            <div
              className="rounded-2xl p-6 text-center"
              style={{ background: "linear-gradient(135deg, hsl(348 99% 58% / 0.08), hsl(186 100% 50% / 0.05))" }}
            >
              <p className="text-xl font-bold text-foreground mb-1">Ready to explore?</p>
              <p className="text-sm text-[hsl(var(--text-secondary))] mb-4">
                Watch live performers right now — free, no signup
              </p>
              <Link
                to="/"
                className="btn-press inline-flex h-12 rounded-full bg-primary text-primary-foreground font-bold text-sm px-8 items-center glow-primary"
              >
                Start Watching →
              </Link>
            </div>
          </section>
        </div>

        {/* Desktop right sidebar */}
        <aside className="hidden lg:block w-[280px] flex-shrink-0">
          <div className="sticky top-20 space-y-4">
            <div className="glass rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Popular Models</h3>
              <div className="space-y-3">
                {sidebarModels.map((m) => (
                  <Link key={m.id} to={`/models/${m.slug}`} className="flex items-center gap-3 group">
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
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-live" />
                      <span className="text-[10px] font-bold text-success">LIVE</span>
                    </span>
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

export default BlogPost;
