import Link from 'next/link';

const footerLinks = [
  { label: 'Home', href: '/' },
  { label: 'About', href: '/about' },
  { label: 'Features', href: '/features' },
  { label: 'Resources', href: '/resources' },
  { label: 'Contact', href: '/contact' },
  { label: 'Sign In', href: '/login' },
];

export function MarketingFooter() {
  return (
    <footer
      style={{
        position: 'relative',
        borderTop: '1px solid var(--border)',
        background: 'linear-gradient(180deg, rgba(14,13,11,.08), rgba(14,13,11,.18))',
      }}
    >
      <div
        style={{
          maxWidth: 1440,
          margin: '0 auto',
          padding: '32px clamp(20px, 2.4vw, 36px) 40px',
          display: 'grid',
          gap: 24,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: 20,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'grid', gap: 10, maxWidth: 420 }}>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontWeight: 800,
                fontSize: 22,
                letterSpacing: '-0.03em',
                color: 'var(--text-h)',
              }}
            >
              Smart<span style={{ color: 'var(--yellow-400)' }}>Campus</span>
            </div>
            <p style={{ color: 'var(--text-body)', fontSize: 14, lineHeight: 1.7 }}>
              A unified platform for discovering campus resources, requesting bookings, reporting issues, and
              coordinating day-to-day operations across the university.
            </p>
          </div>

          <nav
            style={{
              display: 'flex',
              gap: 10,
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'flex-end',
            }}
          >
            {footerLinks.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: '8px 12px',
                  borderRadius: 999,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text-body)',
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 12,
                  letterSpacing: '.03em',
                  transition: 'transform .15s ease, background .15s ease, color .15s ease',
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            color: 'var(--text-muted)',
            fontSize: 12,
          }}
        >
          <span>Smart Campus Management Platform</span>
          <span>Designed for students, staff, managers, and administrators.</span>
        </div>
      </div>
    </footer>
  );
}
