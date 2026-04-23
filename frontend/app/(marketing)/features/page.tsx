import { BellRing, ClipboardList, FolderSearch, LayoutDashboard, ShieldCheck, Wrench } from 'lucide-react';

import { Reveal } from '@/components/marketing/Reveal';
import { Card, Chip } from '@/components/ui';

const featureGroups = [
  {
    title: 'Resource Catalogue',
    description: 'Maintain a structured inventory of spaces, facilities, and equipment with clearer ownership and rules.',
    icon: FolderSearch,
  },
  {
    title: 'Booking Management',
    description: 'Support booking requests with approval flows, status tracking, and better visibility into availability.',
    icon: ClipboardList,
  },
  {
    title: 'Maintenance & Support',
    description: 'Capture issues, assign operational follow-up, and keep reporting tied to the right campus resource.',
    icon: Wrench,
  },
  {
    title: 'Notifications',
    description: 'Keep users informed about changes, approvals, and operational events without relying on scattered updates.',
    icon: BellRing,
  },
  {
    title: 'Role-Based Access Control',
    description: 'Present students, staff, managers, and admins with the actions and visibility relevant to their role.',
    icon: ShieldCheck,
  },
  {
    title: 'Administrative Visibility',
    description: 'Give operational teams a cleaner view of system activity, catalogue quality, and campus coordination.',
    icon: LayoutDashboard,
  },
];

export default function FeaturesPage() {
  return (
    <div style={{ display: 'grid', gap: 72, paddingBottom: 88 }}>
      <section style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px, 2.4vw, 36px)' }}>
        <div style={{ display: 'grid', gap: 18, maxWidth: 820, paddingTop: 20 }}>
          <Reveal>
            <Chip color="glass">Platform Features</Chip>
          </Reveal>
          <Reveal delay={0.04}>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(38px, 6vw, 60px)', fontWeight: 900, lineHeight: 1.04, letterSpacing: '-0.06em', color: 'var(--text-h)' }}>
              Core capabilities for modern campus operations
            </h1>
          </Reveal>
          <Reveal delay={0.08}>
            <p style={{ maxWidth: 720, color: 'var(--text-body)', fontSize: 17, lineHeight: 1.85 }}>
              The platform is organized around the core workflows universities rely on every day: discovering
              resources, coordinating requests, responding to issues, and managing operations with clear role boundaries.
            </p>
          </Reveal>
        </div>
      </section>

      <section style={{ maxWidth: 1440, margin: '0 auto', padding: '0 clamp(20px, 2.4vw, 36px)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          {featureGroups.map((item, index) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={index * 0.05}>
                <Card hoverable style={{ height: '100%' }}>
                  <div style={{ display: 'grid', gap: 16 }}>
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: 18,
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(43,109,232,.12)',
                        color: 'var(--blue-400)',
                        border: '1px solid rgba(43,109,232,.2)',
                      }}
                    >
                      <Icon size={22} />
                    </div>
                    <div style={{ display: 'grid', gap: 8 }}>
                      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text-h)' }}>
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
    </div>
  );
}
