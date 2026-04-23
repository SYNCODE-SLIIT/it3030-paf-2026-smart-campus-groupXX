import { ArrowRight, FolderSearch } from 'lucide-react';

import { ButtonLink } from '@/components/marketing/ButtonLink';
import { Reveal } from '@/components/marketing/Reveal';
import { Card, Chip } from '@/components/ui';

export default function ResourcesPage() {
  return (
    <div style={{ display: 'grid', gap: 56, paddingBottom: 88 }}>
      <section style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px, 2.4vw, 36px)' }}>
        <div style={{ display: 'grid', gap: 18, maxWidth: 760, paddingTop: 20 }}>
          <Reveal>
            <Chip color="glass">Resources</Chip>
          </Reveal>
          <Reveal delay={0.04}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(36px, 6vw, 58px)', fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1.04, color: 'var(--text-h)' }}>
              Public resource browsing is coming next.
            </h1>
          </Reveal>
          <Reveal delay={0.08}>
            <p style={{ maxWidth: 700, color: 'var(--text-body)', lineHeight: 1.85, fontSize: 17 }}>
              This page is reserved for the next phase. For now, you can review the platform overview and sign in to
              access the operational workspace.
            </p>
          </Reveal>
        </div>
      </section>

      <section style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px, 2.4vw, 36px)' }}>
        <Reveal>
          <Card hoverable style={{ maxWidth: 720 }}>
            <div style={{ display: 'grid', gap: 16 }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 18,
                  display: 'grid',
                  placeItems: 'center',
                  background: 'rgba(238,202,68,.12)',
                  color: 'var(--yellow-400)',
                  border: '1px solid rgba(238,202,68,.18)',
                }}
              >
                <FolderSearch size={22} />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: 'var(--text-h)' }}>
                Resource discovery will be added in a later step.
              </h2>
              <p style={{ color: 'var(--text-body)', lineHeight: 1.8 }}>
                The route is in place so the public navigation is complete, but the full public catalogue experience is
                intentionally deferred.
              </p>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <ButtonLink href="/features" variant="glass" iconRight={<ArrowRight size={16} />}>
                  View Features
                </ButtonLink>
                <ButtonLink href="/login" variant="subtle">
                  Sign In
                </ButtonLink>
              </div>
            </div>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
