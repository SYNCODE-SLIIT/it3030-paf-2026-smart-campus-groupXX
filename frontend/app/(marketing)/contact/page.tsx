import { Mail, ShieldAlert } from 'lucide-react';

import { Reveal } from '@/components/marketing/Reveal';
import { Card, Chip } from '@/components/ui';

export default function ContactPage() {
  return (
    <div style={{ display: 'grid', gap: 56, paddingBottom: 88 }}>
      <section style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px, 2.4vw, 36px)' }}>
        <div style={{ display: 'grid', gap: 18, maxWidth: 760, paddingTop: 20 }}>
          <Reveal>
            <Chip color="glass">Contact</Chip>
          </Reveal>
          <Reveal delay={0.04}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 6vw, 58px)', fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1.04, color: 'var(--text-h)' }}>
              Contact workflows will be expanded in a later phase.
            </h1>
          </Reveal>
          <Reveal delay={0.08}>
            <p style={{ maxWidth: 700, color: 'var(--text-body)', lineHeight: 1.85, fontSize: 17 }}>
              The public contact form and backend processing are intentionally deferred. This page keeps the public
              structure complete without introducing unfinished workflow logic.
            </p>
          </Reveal>
        </div>
      </section>

      <section style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px, 2.4vw, 36px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          <Reveal>
            <Card hoverable style={{ height: '100%' }}>
              <div style={{ display: 'grid', gap: 14 }}>
                <Mail size={22} color="var(--yellow-400)" />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-h)' }}>
                  Contact form not enabled yet
                </h2>
                <p style={{ color: 'var(--text-body)', lineHeight: 1.8 }}>
                  Public message handling is not part of this step, so no submission form is exposed yet.
                </p>
              </div>
            </Card>
          </Reveal>
          <Reveal delay={0.05}>
            <Card hoverable style={{ height: '100%' }}>
              <div style={{ display: 'grid', gap: 14 }}>
                <ShieldAlert size={22} color="var(--blue-400)" />
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-h)' }}>
                  Existing theme and layout retained
                </h2>
                <p style={{ color: 'var(--text-body)', lineHeight: 1.8 }}>
                  This placeholder uses the same marketing shell, spacing, and component styling as the rest of the
                  public site.
                </p>
              </div>
            </Card>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
