import { useParams, Navigate, Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function MdLink({ href, children }: { href?: string; children?: React.ReactNode }) {
  if (href?.startsWith('/')) return <Link to={href}>{children}</Link>;
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}
import SEO from '../components/SEO';
import { buildArticleSchema, buildBreadcrumbListSchema } from '../seo/schema';
import Breadcrumbs from '../components/Breadcrumbs';
import blogIndex from '../seo/blogIndex.json';
import '../pages/About.css';

const SITE_URL = 'https://aiworkoutnow.com';

const posts = (blogIndex as {
  posts: Array<{
    slug: string;
    title: string;
    date: string;
    description: string;
    author: string;
    tags: string[];
    coverImage: string;
    body: string;
  }>;
}).posts;

function BlogPost() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? posts.find((p) => p.slug === slug) : undefined;

  if (!post) return <Navigate to="/blog" replace />;

  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
    { name: post.title, path: `/blog/${post.slug}` },
  ];

  const readingTime = Math.max(1, Math.ceil((post.body.split(/\s+/).length || 0) / 200));

  return (
    <>
      <SEO
        title={`${post.title} | AIWorkoutNow Blog`}
        description={post.description || post.title}
        canonicalPath={`/blog/${post.slug}`}
        ogType="article"
        ogImage={post.coverImage ? (post.coverImage.startsWith('http') ? post.coverImage : `${SITE_URL}${post.coverImage}`) : undefined}
        jsonLd={[
          buildBreadcrumbListSchema(breadcrumbs),
          buildArticleSchema({
            headline: post.title,
            description: post.description,
            image: post.coverImage ? `${SITE_URL}${post.coverImage}` : undefined,
            datePublished: post.date,
            author: post.author,
            slug: post.slug,
          }),
        ]}
      />
      <div className="about-page">
        <div className="container">
          <Breadcrumbs items={breadcrumbs} className="mb-4" />
          <div className="content-card">
            <article>
              <h1>{post.title}</h1>
              <p className="text-slate-500 text-sm">
                {post.date && new Date(post.date).toLocaleDateString()}
                {' · '}
                {readingTime} min read
                {post.author && ` · ${post.author}`}
              </p>
              <div className="blog-post-body prose max-w-none mt-6">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: MdLink as any }}>{post.body}</ReactMarkdown>
              </div>

              <div className="my-8 p-6 bg-slate-100 rounded-xl text-center">
                <p className="font-semibold text-slate-900 mb-2">Try the free AI workout generator</p>
                <Link to="/" className="inline-block px-6 py-3 bg-slate-800 text-white font-semibold rounded-lg hover:bg-slate-700">
                  Try AIWorkoutNow →
                </Link>
              </div>
            </article>
            <p className="mt-6">
              <Link to="/blog">← Back to blog</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default BlogPost;
