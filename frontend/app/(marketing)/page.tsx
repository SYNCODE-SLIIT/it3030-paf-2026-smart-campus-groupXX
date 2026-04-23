import { ArrowRight, Building2, CalendarDays, ShieldCheck, Wrench } from 'lucide-react';
import { redirect } from 'next/navigation';

import { ButtonLink } from '@/components/marketing/ButtonLink';
import { HeroDotsBackdrop } from '@/components/marketing/HeroDotsBackdrop';
import { Reveal } from '@/components/marketing/Reveal';
import { Card, Chip } from '@/components/ui';
import { getUserHomePath, needsStudentOnboarding, STUDENT_ONBOARDING_PATH } from '@/lib/auth-routing';
import { getServerAuthState } from '@/lib/server-auth';

const platformHighlights = [
  {
    title: 'Resource Discovery',
    description: 'Browse lecture halls, labs, equipment, and campus assets from one searchable catalogue.',
    icon: Building2,
  },
  {
    title: 'Booking Requests',
    description: 'Request spaces and shared resources with clearer availability, ownership, and approval flow.',
    icon: CalendarDays,
  },
  {
    title: 'Maintenance Reporting',
    description: 'Capture issues quickly and route them to the right support teams without email chains.',
    icon: Wrench,
  },
  {
    title: 'Role-Based Management',
    description: 'Give students, staff, managers, and admins the right level of access with less friction.',
    icon: ShieldCheck,
  },
];

const audience = [
  {
    title: 'Students',
    description: 'Find study spaces, request resources, and follow service updates without jumping between systems.',
  },
  {
    title: 'Academic Staff',
    description: 'Coordinate rooms, teaching spaces, and operational requests with better visibility.',
  },
  {
    title: 'Managers',
    description: 'Oversee approvals, catalogue quality, and campus workflows from a shared operational view.',
  },
  {
    title: 'Administrators',
    description: 'Maintain standards, users, and system-wide operations from a single management platform.',
  },
];

function SectionShell({
  children,
  topPadding = 'clamp(72px, 10vw, 112px)',
  bottomPadding = 'clamp(72px, 10vw, 112px)',
}: {
  children: React.ReactNode;
  topPadding?: string;
  bottomPadding?: string;
}) {
  return (
    <section
      style={{
        width: '100%',
        paddingTop: topPadding,
        paddingBottom: bottomPadding,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 1360,
          margin: '0 auto',
          padding: '0 clamp(16px, 2vw, 32px)',
        }}
      >
        {children}
      </div>
    </section>
  );
}

function SectionIntro({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        width: '100%',
        maxWidth: 760,
        margin: '0 auto 52px',
        display: 'grid',
        gap: 16,
        justifyItems: 'center',
        textAlign: 'center',
      }}
    >
      {children}
    </div>
  );
}

export default async function HomePage() {
  const authState = await getServerAuthState();

  if (authState.appUser) {
    if (needsStudentOnboarding(authState.appUser)) {
      redirect(STUDENT_ONBOARDING_PATH);
    }

    redirect(getUserHomePath(authState.appUser));
  }

  return (
    <div style={{ paddingBottom: 88 }}>
      <section
        style={{
          width: '100%',
          marginTop: -104,
        }}
      >
        <HeroDotsBackdrop
          style={{
            minHeight: '100svh',
            paddingTop: 'calc(104px + clamp(32px, 5vw, 48px))',
            paddingBottom: 'clamp(72px, 10vw, 112px)',
            width: '100%',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 1360,
              margin: '0 auto',
              padding: '0 clamp(16px, 2vw, 32px)',
            }}
          >
            <div
              style={{
                minHeight: 'calc(100svh - (104px + clamp(32px, 5vw, 48px) + clamp(72px, 10vw, 112px)))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '12px 0',
              }}
            >
              <Reveal
                style={{
                  width: '100%',
                  maxWidth: 896,
                  margin: '0 auto',
                  display: 'grid',
                  gap: 30,
                  justifyItems: 'center',
                  textAlign: 'center',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
                  <Chip color="glass" dot>University Operations</Chip>
                  <Chip color="blue">Resource Visibility</Chip>
                  <Chip color="yellow">Booking Coordination</Chip>
                </div>

                <div style={{ display: 'grid', gap: 18, justifyItems: 'center' }}>
                  <h1
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 'clamp(48px, 7vw, 72px)',
                      lineHeight: 1.08,
                      fontWeight: 900,
                      letterSpacing: '-0.06em',
                      color: 'var(--text-h)',
                      maxWidth: 820,
                    }}
                  >
                    Smart Campus Management Platform
                  </h1>
                  <p
                    style={{
                      maxWidth: 760,
                      fontSize: 17,
                      lineHeight: 1.8,
                      color: 'var(--text-body)',
                    }}
                  >
                    Discover campus resources, request bookings, report maintenance issues, and manage operations through
                    one connected university platform built for real campus workflows.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'center' }}>
                  <ButtonLink href="/resources" size="lg" variant="glass" iconRight={<ArrowRight size={16} />}>
                    Explore Resources
                  </ButtonLink>
                  <ButtonLink href="/login" size="lg" variant="subtle">
                    Sign In
                  </ButtonLink>
                </div>
              </Reveal>
            </div>
          </div>
        </HeroDotsBackdrop>
      </section>

      <SectionShell>
        <Reveal>
          <SectionIntro>
            <Chip color="glass">Platform Highlights</Chip>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 44px)', fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--text-h)' }}>
              Key workflows, one connected platform
            </h2>
            <p style={{ maxWidth: 720, color: 'var(--text-body)', lineHeight: 1.8 }}>
              Smart Campus combines resource visibility, request handling, and operational oversight in a structure that
              feels familiar to university teams.
            </p>
          </SectionIntro>
        </Reveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 24,
            alignItems: 'stretch',
          }}
        >
          {platformHighlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={index * 0.06}>
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
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 21, fontWeight: 700, color: 'var(--text-h)' }}>
                        {item.title}
                      </h3>
                      <p style={{ color: 'var(--text-body)', lineHeight: 1.8 }}>{item.description}</p>
                    </div>
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>
      </SectionShell>

      <SectionShell>
        <Reveal>
          <SectionIntro>
            <Chip color="blue">Who It Serves</Chip>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(30px, 4vw, 42px)', fontWeight: 800, letterSpacing: '-0.05em', color: 'var(--text-h)' }}>
              Designed for the people who keep campus moving
            </h2>
            <p style={{ color: 'var(--text-body)', lineHeight: 1.8, maxWidth: 620 }}>
              From day-to-day student requests to administrative oversight, the platform is structured around the real
              roles involved in campus operations.
            </p>
          </SectionIntro>
        </Reveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 24,
            alignItems: 'stretch',
          }}
        >
          {audience.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.05}>
              <Card hoverable style={{ height: '100%' }}>
                <div style={{ display: 'grid', gap: 10 }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-h)' }}>
                    {item.title}
                  </h3>
                  <p style={{ color: 'var(--text-body)', lineHeight: 1.8 }}>{item.description}</p>
                </div>
              </Card>
            </Reveal>
          ))}
        </div>
      </SectionShell>

      <SectionShell topPadding="0" bottomPadding="clamp(72px, 10vw, 112px)">
        <Reveal>
          <Card
            variant="dark"
            style={{
              overflow: 'hidden',
              background: 'linear-gradient(135deg, rgba(14,13,11,.96), rgba(28,26,20,.98))',
            }}
          >
            <div style={{ display: 'grid', gap: 18 }}>
              <Chip color="glass">Get Started</Chip>
              <div style={{ display: 'grid', gap: 10 }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 4vw, 40px)', fontWeight: 800, letterSpacing: '-0.05em', color: '#fff' }}>
                  Bring campus requests, resources, and operations into one workflow.
                </h2>
                <p style={{ maxWidth: 760, color: 'rgba(255,255,255,.68)', lineHeight: 1.8 }}>
                  Explore the platform structure, review its features, and sign in to continue into the operational
                  workspace.
                </p>
              </div>
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
                <ButtonLink href="/features" variant="glass" size="lg">
                  View Features
                </ButtonLink>
                <ButtonLink href="/login" variant="subtle" size="lg">
                  Sign In
                </ButtonLink>
              </div>
            </div>
          </Card>
        </Reveal>
      </SectionShell>
    </div>
  );
}
