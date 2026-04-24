import { Mail, MapPin, Phone } from 'lucide-react';
import Link from 'next/link';

import { HeroDotsBackdrop } from '@/components/marketing/HeroDotsBackdrop';
import { MarketingContactForm } from '@/components/marketing/MarketingContactForm';
import { Reveal } from '@/components/marketing/Reveal';
import { ButtonLink } from '@/components/marketing/ButtonLink';
import { Card, Chip } from '@/components/ui';

const CONTACT_EMAIL = 'teamsyncode@gmail.com';
const CONTACT_PHONE_DISPLAY = '+94 77 239 7767';
const CONTACT_PHONE_TEL = '+94772397767';
const ADDRESS_LINE = 'SLIIT, New Kandy Road, Malabe';

const MAP_EMBED_SRC =
  'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3960.8388058873075!2d79.97036959999999!3d6.9146774999999995!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3ae256db1a6771c5%3A0x2c63e344ab9a7536!2sSri%20Lanka%20Institute%20of%20Information%20Technology!5e0!3m2!1sen!2slk!4v1713955200000!5m2!1sen!2slk';

const MAP_LINK =
  'https://www.google.com/maps/place/Sri+Lanka+Institute+of+Information+Technology/@6.9146775,79.9703696,17z/data=!3m1!4b1!4m6!3m5!1s0x3ae256db1a6771c5:0x2c63e344ab9a7536!8m2!3d6.9146775!4d79.9729445!16zL20vMDRtMmcz?entry=ttu';

const PAGE_GUTTER = 'clamp(6px, 0.85vw, 14px)';
const CONTENT_MAX = 1420;

const contactCards = [
  {
    key: 'phone',
    title: 'Phone',
    icon: Phone,
    body: (
      <a
        href={`tel:${CONTACT_PHONE_TEL}`}
        style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}
      >
        {CONTACT_PHONE_DISPLAY}
      </a>
    ),
  },
  {
    key: 'email',
    title: 'Email',
    icon: Mail,
    body: (
      <a href={`mailto:${CONTACT_EMAIL}`} style={{ color: 'inherit', textDecoration: 'none', fontWeight: 600 }}>
        {CONTACT_EMAIL}
      </a>
    ),
  },
  {
    key: 'office',
    title: 'Campus',
    icon: MapPin,
    body: <span style={{ fontWeight: 600 }}>{ADDRESS_LINE}</span>,
  },
];

export default function ContactPage() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(48px, 6.5vw, 96px)',
        paddingBottom: 88,
      }}
    >
      <section style={{ width: '100%', marginTop: -104 }}>
        <HeroDotsBackdrop
          style={{
            minHeight: 'min(52svh, 520px)',
            paddingTop: 'calc(104px + clamp(28px, 4vw, 44px))',
            paddingBottom: 'clamp(40px, 6vw, 64px)',
            width: '100%',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: CONTENT_MAX,
              margin: '0 auto',
              padding: `0 ${PAGE_GUTTER}`,
            }}
          >
            <Reveal
              style={{
                maxWidth: 720,
                margin: '0 auto',
                display: 'grid',
                gap: 18,
                justifyItems: 'center',
                textAlign: 'center',
              }}
            >
              <Chip color="glass">Contact</Chip>
              <h1
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(36px, 5.5vw, 52px)',
                  lineHeight: 1.06,
                  fontWeight: 900,
                  letterSpacing: '-0.06em',
                  color: 'var(--text-h)',
                  margin: 0,
                }}
              >
                Contact us
              </h1>
              <p style={{ margin: 0, maxWidth: 560, fontSize: 17, lineHeight: 1.8, color: 'var(--text-body)' }}>
                Reach the Smart Campus team for partnership questions, product feedback, or help getting your university
                workspace set up.
              </p>
            </Reveal>
          </div>
        </HeroDotsBackdrop>
      </section>

      <section
        style={{
          maxWidth: CONTENT_MAX,
          margin: '0 auto',
          width: '100%',
          padding: `clamp(8px, 1.2vw, 16px) ${PAGE_GUTTER}`,
          display: 'grid',
          gap: 'clamp(36px, 4.8vw, 56px)',
        }}
      >
        <Reveal>
          <div style={{ display: 'grid', gap: 14, textAlign: 'center' }}>
            <Chip color="yellow">Get in touch</Chip>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(26px, 3.4vw, 36px)',
                fontWeight: 800,
                letterSpacing: '-0.05em',
                color: 'var(--text-h)',
                margin: 0,
              }}
            >
              We are here to help
            </h2>
            <p style={{ margin: '0 auto', maxWidth: 560, color: 'var(--text-body)', lineHeight: 1.75, fontSize: 15 }}>
              Prefer email or phone? Use the details below. You can also send a structured message — administrators see
              it in the console.
            </p>
          </div>
        </Reveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
            gap: 'clamp(16px, 2.2vw, 28px)',
            width: '100%',
          }}
        >
          {contactCards.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.key} delay={index * 0.05} style={{ minWidth: 0, height: '100%' }}>
                <Card
                  hoverable
                  contentPadding="clamp(22px, 2.4vw, 30px) clamp(18px, 2vw, 26px)"
                  style={{
                    height: '100%',
                    minHeight: 'clamp(200px, 22vw, 240px)',
                    background: `
                      linear-gradient(145deg, rgba(14,13,11,.94), rgba(32,28,22,.92)),
                      radial-gradient(circle at 20% 0%, rgba(238,202,68,.18), transparent 45%)
                    `,
                    borderColor: 'rgba(238,202,68,.2)',
                    color: '#f7f4ee',
                  }}
                >
                  <div style={{ display: 'grid', gap: 16, minWidth: 0 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 16,
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(238,202,68,.16)',
                        color: 'var(--yellow-400)',
                        border: '1px solid rgba(238,202,68,.22)',
                      }}
                    >
                      <Icon size={24} />
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 'clamp(18px, 1.9vw, 22px)' }}>
                      {item.title}
                    </div>
                    <div
                      style={{
                        fontSize: 'clamp(14px, 1.35vw, 16px)',
                        lineHeight: 1.6,
                        color: 'rgba(247,244,238,.9)',
                        overflowWrap: 'anywhere',
                      }}
                    >
                      {item.body}
                    </div>
                  </div>
                </Card>
              </Reveal>
            );
          })}
        </div>

        <Reveal delay={0.08}>
          <Card contentPadding={0} style={{ overflow: 'hidden', borderColor: 'var(--border)' }}>
            <div style={{ aspectRatio: '16 / 9', minHeight: 300, width: '100%', background: 'var(--surface-muted)' }}>
              <iframe
                title="SLIIT on Google Maps"
                src={MAP_EMBED_SRC}
                width="100%"
                height="100%"
                style={{ border: 0, display: 'block', minHeight: 300 }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 12,
                padding: '14px 18px',
                borderTop: '1px solid var(--border)',
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--text-body)' }}>{ADDRESS_LINE}</span>
              <Link
                href={MAP_LINK}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontWeight: 600,
                  fontSize: 13,
                  color: 'var(--blue-400)',
                }}
              >
                Open in Google Maps
              </Link>
            </div>
          </Card>
        </Reveal>
      </section>

      <section
        style={{
          maxWidth: CONTENT_MAX,
          margin: '0 auto',
          width: '100%',
          padding: `0 ${PAGE_GUTTER}`,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))',
            gap: 'clamp(32px, 4vw, 48px)',
            alignItems: 'start',
          }}
        >
          <Reveal>
            <Card contentPadding="clamp(22px, 2.5vw, 32px) clamp(22px, 2.8vw, 36px)">
              <div style={{ display: 'grid', gap: 10, marginBottom: 22 }}>
                <Chip color="glass">Send a message</Chip>
                <h2
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: 'clamp(22px, 2.4vw, 28px)',
                    fontWeight: 800,
                    letterSpacing: '-0.04em',
                    color: 'var(--text-h)',
                    margin: 0,
                  }}
                >
                  Tell us what you need
                </h2>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: 'var(--text-body)' }}>
                  Include a clear title and enough context in the message. Anyone can submit:{' '}
                  <strong style={{ color: 'var(--text-h)' }}>no sign-in or campus account is required.</strong>
                </p>
              </div>
              <MarketingContactForm />
            </Card>
          </Reveal>

          <Reveal delay={0.06}>
            <div style={{ display: 'grid', gap: 22 }}>
              <Chip color="blue">Response time</Chip>
              <h3
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(22px, 2.6vw, 30px)',
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  color: 'var(--text-h)',
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                Built for campus teams, answered by people who understand them.
              </h3>
              <p style={{ margin: 0, fontSize: 15, lineHeight: 1.8, color: 'var(--text-body)' }}>
                Whether you are evaluating Smart Campus for your institution or you already run bookings and tickets on
                the platform, we will route your note to the right channel.
              </p>
              <Card style={{ padding: '18px 20px', borderStyle: 'dashed' as const }}>
                <p style={{ margin: 0, fontSize: 13, lineHeight: 1.7, color: 'var(--text-body)' }}>
                  The message form works without signing in. For live campus issues (rooms, equipment, tickets) after
                  you have an account, use your workspace —{' '}
                  <Link href="/login" style={{ color: 'var(--blue-400)', fontWeight: 600 }}>
                    sign in here
                  </Link>
                  .
                </p>
              </Card>
            </div>
          </Reveal>
        </div>
      </section>

      <section style={{ maxWidth: CONTENT_MAX, margin: '0 auto', width: '100%', padding: `0 ${PAGE_GUTTER} 72px` }}>
        <Reveal>
          <Card
            style={{
              padding: 'clamp(22px, 3vw, 32px)',
              background: `
                linear-gradient(145deg, rgba(14,13,11,.94), rgba(32,28,22,.92)),
                radial-gradient(circle at 90% 20%, rgba(43,109,232,.14), transparent 42%)
              `,
              borderColor: 'rgba(238,202,68,.2)',
            }}
          >
            <div style={{ display: 'grid', gap: 14, textAlign: 'center', maxWidth: 520, margin: '0 auto' }}>
              <Chip color="yellow">Let&apos;s talk</Chip>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 'clamp(22px, 3vw, 30px)',
                  fontWeight: 800,
                  letterSpacing: '-0.04em',
                  color: '#f7f4ee',
                  margin: 0,
                  lineHeight: 1.15,
                }}
              >
                Ready to streamline campus operations?
              </h2>
              <p style={{ margin: 0, fontSize: 14, lineHeight: 1.75, color: 'rgba(247,244,238,.88)' }}>
                Explore the public resource catalogue or continue to the portal when you have an account.
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', paddingTop: 6 }}>
                <ButtonLink href="/resources" size="md" variant="glass">
                  Browse resources
                </ButtonLink>
                <ButtonLink href="/login" size="md" variant="subtle">
                  Sign in
                </ButtonLink>
              </div>
            </div>
          </Card>
        </Reveal>
      </section>
    </div>
  );
}
