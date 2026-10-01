import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicNav } from '../../components/layout/PublicNav';
import { Footer } from '../../components/layout/Footer';
import { ShoppingCart, Users, CreditCard, Tag, Box, ArrowRight, LayoutTemplate } from 'lucide-react';
import '../../styles/public-dark.css';

export function EcommerceSchema() {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = 'Ecommerce Database Schema Example (Free Template)';
    let meta = document.querySelector('meta[name="keywords"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'keywords'); document.head.appendChild(meta); }
    meta.setAttribute('content', 'ecommerce schema design');
  }, []);

  return (
    <div className="pd-root">
      <PublicNav dark />

      {/* ── Hero ── */}
      <div className="pd-hero" style={{ paddingTop: '140px' }}>
        <div className="pd-hero-dot-grid" aria-hidden />
        <div className="pd-hero-glow" aria-hidden />
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="pd-hero-badge"><LayoutTemplate size={13} /> Starter Template</div>
          <h1 className="pd-h1">E-commerce Database Schema</h1>
          <p className="pd-lead">The built-in E-commerce template has users, products, orders and order_items. This page also sketches variants, carts and payments, which you can add on the canvas.</p>
          <div className="pd-hero-actions">
            <button className="pd-btn-primary" onClick={() => navigate('/app/templates')}>Use this template →</button>
          </div>
        </div>
      </div>

      {/* ── Problem ── */}
      <section className="pd-section--alt">
        <div className="pd-inner--narrow">
          <div className="pd-label">// The challenge</div>
          <h2 className="pd-h2">E-commerce systems get complex fast</h2>
          <p className="pd-body-text" style={{ marginBottom: '24px' }}>Even simple stores require:</p>
          <div className="pd-grid-2">
            {['product catalogs', 'inventory tracking', 'carts and orders', 'payments and refunds'].map(item => (
              <div key={item} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px', color: 'var(--pd-text)' }}>
                <ArrowRight size={14} style={{ color: 'var(--pd-brand)', flexShrink: 0 }} /> {item}
              </div>
            ))}
          </div>
          <p style={{ fontFamily: 'var(--pd-mono)', color: 'var(--pd-accent)', fontWeight: 600, marginTop: '24px', fontSize: '13px' }}>
            Without a clear schema, things break quickly as you scale.
          </p>
        </div>
      </section>

      {/* ── Visual schema ── */}
      <section className="pd-section">
        <div className="pd-inner">
          <div className="pd-label">// Illustrative sketch</div>
          <h2 className="pd-h2">How this schema is structured</h2>
          <div style={{ display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '40px' }}>
            {[
              { icon: <Tag size={14} />, name: 'Products', fields: ['id (PK)', 'name', 'price'] },
              null,
              { icon: <ShoppingCart size={14} />, name: 'Orders', fields: ['id (PK)', 'user_id (FK)', 'total_amount'] },
              null,
              { icon: <CreditCard size={14} />, name: 'Payments', fields: ['id (PK)', 'order_id (FK)', 'status'] },
            ].map((item, i) =>
              item === null
                ? <div key={i} className="pd-connector" />
                : (
                  <div key={item.name} className="pd-schema-table">
                    <div className="pd-schema-table__header">
                      <span style={{ color: 'var(--pd-brand)' }}>{item.icon}</span> {item.name}
                    </div>
                    {item.fields.map(f => <div key={f} className="pd-schema-table__row">{f}</div>)}
                  </div>
                )
            )}
          </div>
          <p style={{ textAlign: 'center', fontFamily: 'var(--pd-mono)', fontSize: '12px', color: 'var(--pd-muted)' }}>
            Products → Orders → Payments — the e-commerce core.
          </p>
        </div>
      </section>

      {/* ── Explanation ── */}
      <section className="pd-section--alt">
        <div className="pd-inner">
          <div className="pd-grid-2">
            <div>
              <div className="pd-label">// Typical tables</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {[
                  { icon: <Users size={18} />, name: 'Users', desc: 'Customer accounts.' },
                  { icon: <Tag size={18} />, name: 'Products', desc: 'Product details.' },
                  { icon: <Box size={18} />, name: 'Product Variants', desc: 'Sizes, colors, SKUs.' },
                  { icon: <ShoppingCart size={18} />, name: 'Carts & Orders', desc: 'Temporary user selections converting into finalized purchases.' },
                  { icon: <CreditCard size={18} />, name: 'Payments', desc: 'Payment transactions linked to orders.' },
                ].map(t => (
                  <div key={t.name} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--pd-brand)', flexShrink: 0, marginTop: '2px' }}>{t.icon}</span>
                    <div>
                      <div style={{ fontFamily: 'var(--pd-display)', fontWeight: 700, color: 'var(--pd-text)', marginBottom: '4px' }}>{t.name}</div>
                      <div className="pd-body-text" style={{ fontSize: '13px' }}>{t.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="pd-label">// Relationships</div>
              <div className="pd-card">
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  {['Users create carts', 'Carts convert into orders', 'Orders contain multiple products', 'Payments are linked to orders'].map(r => (
                    <li key={r} style={{ display: 'flex', gap: '10px', fontSize: '14px', color: 'var(--pd-muted)' }}>
                      <span style={{ color: 'var(--pd-brand)' }}>✓</span> {r}
                    </li>
                  ))}
                </ul>
              </div>
              <div style={{ marginTop: '24px' }}>
                <h3 className="pd-h3">Start from a clear structure</h3>
                <p className="pd-body-text">Poor schema design leads to inconsistent orders, inventory bugs, and payment mismatches.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="pd-cta pd-section">
        <div className="pd-cta-glow-l" aria-hidden />
        <div className="pd-cta-glow-r" aria-hidden />
        <div className="pd-cta-inner">
          <h2 className="pd-cta-h2">Start your store schema from a template.</h2>
          <p className="pd-cta-sub">Free and open source. Start from the template in your browser, edit it on the canvas, and export SQL, Prisma or Drizzle.</p>
          <button className="pd-btn-primary" onClick={() => navigate('/app/templates')}>Open the templates →</button>
        </div>
      </div>

      <Footer />
    </div>
  );
}
