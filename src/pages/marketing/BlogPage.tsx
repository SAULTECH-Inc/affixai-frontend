import { Link } from 'react-router-dom';
import { MarketingLayout, PageHero } from '@/components/marketing/MarketingLayout';
import { Seo } from '@/components/Seo';
import { Calendar, Clock, ArrowRight } from 'lucide-react';
import { POSTS } from '@/lib/blog';

// Blog index page. The post registry lives in src/lib/blog.ts; the full
// bodies are individual React components under src/pages/marketing/blog/.

export default function BlogPage() {
  return (
    <MarketingLayout>
      <Seo
        title="Blog"
        description="Product updates, engineering walkthroughs, and the occasional rant about form design — from the AffixAI team."
        path="/blog"
        jsonLd={{
          '@context': 'https://schema.org',
          '@type': 'Blog',
          name: 'AffixAI Blog',
          url: 'https://affixai.com/blog',
          blogPost: POSTS.map((p) => ({
            '@type': 'BlogPosting',
            headline: p.title,
            url: `https://affixai.com/blog/${p.slug}`,
            datePublished: p.iso_date,
            author: { '@type': 'Organization', name: 'AffixAI' },
          })),
        }}
      />
      <PageHero
        eyebrow="Blog"
        title="Notes from the team"
        subtitle="Product updates, engineering walkthroughs, and the occasional rant about form design."
      />
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="space-y-3">
          {POSTS.map((p) => (
            <Link
              key={p.slug}
              to={`/blog/${p.slug}`}
              className="block group rounded-2xl border border-border bg-bg-elevated hover:border-brand-500/40 transition p-6 sm:p-7"
            >
              <div className="flex items-center gap-3 text-xs text-fg-subtle mb-2">
                <span className="text-brand-300 font-medium">{p.tag}</span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {p.date}
                </span>
                <span>·</span>
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {p.read}
                </span>
              </div>
              <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight group-hover:text-gradient-brand transition">
                {p.title}
              </h2>
              <p className="mt-2 text-fg-muted">{p.excerpt}</p>
              <div className="mt-4 inline-flex items-center gap-1.5 text-sm text-brand-300 group-hover:gap-2.5 transition-all">
                Read post
                <ArrowRight className="h-3.5 w-3.5" />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </MarketingLayout>
  );
}
