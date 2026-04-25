import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../../components/layout/PublicNav';
import { Footer } from '../../components/layout/Footer';
import { ArrowRight, Columns, Database } from 'lucide-react';
import '../../styles/public-dark.css';

export function CompareIndex() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Compare Database Design Tools';
    let meta = document.querySelector('meta[name="keywords"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'keywords'); document.head.appendChild(meta); }
    meta.setAttribute('content', 'database design tools comparison, dbdiagram alternative, drawsql alternative');
  }, []);

  const comparisons = [
    {
      icon: <Columns size={22} />,
      title: 'dbdiagram vs Modellr',
      desc: 'dbdiagram is great for simple DBML. Learn why modern teams using Prisma and Drizzle are switching to a synced workflow.',
      path: '/compare/dbdiagram',
    },
    {
      icon: <Database size={22} />,
      title: 'DrawSQL vs Modellr',
      desc: 'DrawSQL requires manual canvas building. See how AI generation and auto-layout replaces the friction.',
      path: '/compare/drawsql',
    },
  ];

  return (
    <div className="pd-root">
      <PublicNav dark />

      <div className="pd-hero" style={{ paddingTop: '140px' }}>
        <div className="pd-hero-dot-grid" aria-hidden />
        <div className="pd-hero-glow" aria-hidden />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="pd-label">// Compare</div>
          <h1 className="pd-h1">Compare tools</h1>
          <p className="pd-lead">See how Modellr stacks up against the legacy alternatives on the market.</p>
        </div>
      </div>

      <section className="pd-section">
        <div className="pd-inner" style={{ maxWidth: '760px' }}>
          <div className="pd-grid-2">
            {comparisons.map(c => (
              <div key={c.path} className="pd-card" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="pd-card__icon">{c.icon}</div>
                <h2 className="pd-h3" style={{ fontSize: '18px', marginBottom: '10px' }}>{c.title}</h2>
                <p className="pd-body-text" style={{ flex: 1, marginBottom: '24px' }}>{c.desc}</p>
                <button
                  onClick={() => navigate(c.path)}
                  className="pd-btn-outline"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
                >
                  See comparison <ArrowRight size={14} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
