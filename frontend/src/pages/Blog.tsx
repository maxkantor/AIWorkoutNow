import { Link } from 'react-router-dom';
import SEO from '../components/SEO';
import { buildBreadcrumbListSchema } from '../seo/schema';
import Breadcrumbs from '../components/Breadcrumbs';
import blogIndex from '../seo/blogIndex.json';
import '../pages/About.css';

const posts = (blogIndex as { posts: Array<{ slug: string; title: string; date: string; description: string }> }).posts;

function Blog() {
  const breadcrumbs = [
    { name: 'Home', path: '/' },
    { name: 'Blog', path: '/blog' },
  ];

  return (
    <>
      <SEO
        title="Blog | AI Workout Generator Tips & Guides | AIWorkoutNow"
        description="Tips and guides for getting the most from our free AI workout generator. No signup required."
        canonicalPath="/blog"
        jsonLd={buildBreadcrumbListSchema(breadcrumbs)}
      />
      <div className="about-page">
        <div className="container">
          <Breadcrumbs items={breadcrumbs} className="mb-4" />
          <div className="content-card">
            <h1>Blog</h1>
            <p className="intro-text">Tips and guides for the free AI workout generator. No signup required.</p>
            <ul className="blog-list" style={{ listStyle: 'none', padding: 0 }}>
              {posts.map((post) => (
                <li key={post.slug} style={{ marginBottom: '1.5rem' }}>
                  <Link to={`/blog/${post.slug}`} className="font-semibold text-slate-900 hover:underline">
                    {post.title}
                  </Link>
                  {post.date && (
                    <span className="text-slate-500 text-sm ml-2">{new Date(post.date).toLocaleDateString()}</span>
                  )}
                  {post.description && <p className="text-slate-600 mt-1">{post.description}</p>}
                </li>
              ))}
            </ul>
            <p className="mt-6">
              <Link to="/">← Back to generator</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Blog;
