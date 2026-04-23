import { Compass, Network, School, Sparkles } from 'lucide-react';

import { Reveal } from '@/components/marketing/Reveal';
import { Card, Chip } from '@/components/ui';

const sections = [
  {
    title: 'What Smart Campus is',
    description:
      'Smart Campus is a centralized university operations platform that brings resource visibility, booking workflows, and issue reporting into one coordinated system.',
    icon: Sparkles,
  },
  {
    title: 'The problem it solves',
    description:
      'Many campuses manage rooms, equipment, approvals, and maintenance through disconnected spreadsheets, inboxes, and ad hoc processes. That slows decisions and obscures accountability.',
    icon: Compass,
  },
  {
    title: 'What the platform improves',
    description:
      'By connecting catalogue management, requests, and operational tracking, the platform reduces duplicated effort and gives teams a clearer view of campus activity.',
    icon: Network,
  },
  {
    title: 'Who it is designed for',
    description:
      'Students, academic staff, managers, and administrators each get a role-appropriate view of the same operational system instead of fragmented tools.',
    icon: School,
  },
];

export default function AboutPage() {
  return (
    <div style={{ display: 'grid', gap: 80, paddingBottom: 88 }}>
      <section style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px, 2.4vw, 36px)' }}>
        <div style={{ display: 'grid', gap: 18, maxWidth: 840, paddingTop: 20 }}>
          <Reveal>
            <Chip color="glass">About Smart Campus</Chip>
          </Reveal>
          <Reveal delay={0.04}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(38px, 6vw, 62px)', fontWeight: 900, letterSpacing: '-0.06em', lineHeight: 1.02, color: 'var(--text-h)' }}>
              A smarter way to coordinate campus spaces, services, and daily operations.
            </h1>
          </Reveal>
          <Reveal delay={0.08}>
            <p style={{ maxWidth: 720, color: 'var(--text-body)', fontSize: 17, lineHeight: 1.85 }}>
              Smart Campus is designed to help universities manage shared resources with more structure, better
              visibility, and fewer manual handoffs between teams.
            </p>
          </Reveal>
        </div>
      </section>

      <section style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px, 2.4vw, 36px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 18 }}>
          {sections.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={index * 0.05}>
                <Card hoverable style={{ height: '100%' }}>
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 16,
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(238,202,68,.12)',
                        color: 'var(--yellow-400)',
                        border: '1px solid rgba(238,202,68,.16)',
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 700, color: 'var(--text-h)' }}>
                        {item.title}
                      </h2>
                      <p style={{ color: 'var(--text-body)', lineHeight: 1.8 }}>{item.description}</p>
                    </div>
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px, 2.4vw, 36px)' }}>
        <Reveal>
          <Card
            style={{
              background: 'linear-gradient(180deg, rgba(238,202,68,.1), rgba(238,202,68,.03))',
            }}
          >
            <div style={{ display: 'grid', gap: 16, maxWidth: 880 }}>
              <Chip color="yellow">Why Centralization Matters</Chip>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--text-h)' }}>
                Centralized campus management improves clarity, speed, and accountability.
              </h2>
              <p style={{ color: 'var(--text-body)', lineHeight: 1.85 }}>
                When the same platform supports catalogue ownership, request intake, issue handling, and role-based
                decision making, teams spend less time reconciling information and more time resolving real campus
                needs.
              </p>
            </div>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
