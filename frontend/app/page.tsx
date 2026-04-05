'use client';

import React from 'react';
import {
  Alert,
  Avatar,
  AvatarStack,
  Badge,
  Button,
  Card,
  Checkbox,
  Chip,
  Divider,
  Input,
  Progress,
  Radio,
  Select,
  Skeleton,
  Tabs,
  Textarea,
  Toggle,
  Tooltip,
} from '@/components/ui';

export default function Home() {
  const [tab1, setTab1] = React.useState('overview');
  const [tab2, setTab2] = React.useState('all');
  const [tab3, setTab3] = React.useState('active');

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 24px 80px' }}>

      {/* Header */}
      <div style={{ marginBottom: 56 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.2em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
          Smart Campus · UI Kit
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.03em' }}>
          Component Preview
        </h1>
      </div>

      {/* ── BUTTONS ── */}
      <Section label="01" title="Buttons">
        <Row label="Variants">
          <Button variant="glass">Glass</Button>
          <Button variant="primary">Primary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="ghost-accent">Ghost Accent</Button>
          <Button variant="subtle">Subtle</Button>
          <Button variant="dark">Dark</Button>
        </Row>
        <Row label="Semantic">
          <Button variant="success">Success</Button>
          <Button variant="info">Info</Button>
          <Button variant="danger">Danger</Button>
          <Button variant="ghost-danger">Ghost Danger</Button>
        </Row>
        <Row label="Sizes">
          <Button variant="primary" size="xs">XSmall</Button>
          <Button variant="primary" size="sm">Small</Button>
          <Button variant="primary" size="md">Medium</Button>
          <Button variant="primary" size="lg">Large</Button>
          <Button variant="primary" size="xl">XLarge</Button>
        </Row>
        <Row label="States">
          <Button variant="primary" loading>Loading</Button>
          <Button variant="primary" disabled>Disabled</Button>
          <Button variant="glass" fullWidth>Full Width</Button>
        </Row>
      </Section>

      <Divider style={{ margin: '48px 0' }} />

      {/* ── CHIPS & BADGES ── */}
      <Section label="02" title="Chips & Badges">
        <Row label="Chip variants">
          <Chip color="yellow" dot>Active</Chip>
          <Chip color="red" dot>Error</Chip>
          <Chip color="green" dot>Success</Chip>
          <Chip color="blue">Info</Chip>
          <Chip color="orange">Warning</Chip>
          <Chip color="neutral">Neutral</Chip>
          <Chip color="glass" dot>Glass</Chip>
        </Row>
        <Row label="Chip sizes">
          <Chip color="yellow" size="sm">Small</Chip>
          <Chip color="yellow" size="md">Medium</Chip>
          <Chip color="yellow" size="lg">Large</Chip>
        </Row>
        <Row label="Badges">
          <Badge color="yellow">4</Badge>
          <Badge color="red">12</Badge>
          <Badge color="green">3</Badge>
          <Badge color="blue">7</Badge>
          <Badge color="neutral">99</Badge>
        </Row>
      </Section>

      <Divider style={{ margin: '48px 0' }} />

      {/* ── FORM INPUTS ── */}
      <Section label="03" title="Form Controls">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <Input label="Default" placeholder="Enter value…" />
          <Input label="With hint" placeholder="username" hint="Must be unique across the platform" />
          <Input label="Error state" placeholder="Email" status="error" error="Invalid email address" defaultValue="bad@" />
          <Input label="Success state" placeholder="Email" status="success" defaultValue="valid@campus.edu" />
          <Input label="Disabled" placeholder="Cannot edit" disabled defaultValue="readonly value" />
          <Select
            label="Select option"
            placeholder="Choose…"
            options={[
              { value: 'a', label: 'Option A' },
              { value: 'b', label: 'Option B' },
              { value: 'c', label: 'Option C' },
            ]}
          />
        </div>
        <div style={{ marginTop: 20 }}>
          <Textarea label="Textarea" placeholder="Write something…" rows={3} />
        </div>
        <Row label="Checkbox & Radio">
          <Checkbox label="Accept terms" defaultChecked />
          <Checkbox label="Subscribe" />
          <Checkbox label="Disabled" disabled />
          <Radio label="Option A" name="demo" defaultChecked />
          <Radio label="Option B" name="demo" />
          <Radio label="Disabled" name="demo2" disabled />
        </Row>
        <Row label="Toggle">
          <Toggle label="Notifications" defaultChecked />
          <Toggle label="Dark mode" />
          <Toggle label="Disabled" disabled />
        </Row>
      </Section>

      <Divider style={{ margin: '48px 0' }} />

      {/* ── CARDS ── */}
      <Section label="04" title="Cards">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
          <Card hoverable>
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-h)', marginBottom: 6 }}>Default Card</p>
            <p style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6 }}>Hover to see the lift effect on this card.</p>
          </Card>
          <Card
            hoverable
            footer={
              <>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Updated today</span>
                <Button variant="ghost" size="xs">View</Button>
              </>
            }
          >
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: 'var(--text-h)', marginBottom: 6 }}>With Footer</p>
            <p style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6 }}>Card with a footer row containing actions.</p>
          </Card>
          <Card variant="dark">
            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#fff', marginBottom: 6 }}>Dark Card</p>
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.42)', lineHeight: 1.6 }}>Uses surface-dark background.</p>
          </Card>
        </div>
      </Section>

      <Divider style={{ margin: '48px 0' }} />

      {/* ── ALERTS ── */}
      <Section label="05" title="Alerts">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Alert variant="success" title="Enrolled successfully" dismissible onDismiss={() => {}}>
            You have been registered for COMP3030 — Advanced Algorithms.
          </Alert>
          <Alert variant="error" title="Submission failed">
            Could not upload your assignment. Check your file size and try again.
          </Alert>
          <Alert variant="warning" title="Deadline approaching">
            Your project report is due in 2 days.
          </Alert>
          <Alert variant="info" title="Campus notice">
            The library will close at 18:00 this Friday for maintenance.
          </Alert>
          <Alert variant="neutral">
            No changes were made to your profile.
          </Alert>
        </div>
      </Section>

      <Divider style={{ margin: '48px 0' }} />

      {/* ── PROGRESS ── */}
      <Section label="06" title="Progress">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Progress value={72} label="Course completion" showValue color="yellow" size="md" />
          <Progress value={45} label="Assignment score" showValue color="blue" size="md" />
          <Progress value={90} label="Attendance" showValue color="green" size="lg" />
          <Progress value={30} label="Storage used" showValue color="red" size="sm" />
        </div>
      </Section>

      <Divider style={{ margin: '48px 0' }} />

      {/* ── TABS ── */}
      <Section label="07" title="Tabs">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Underline</p>
            <Tabs
              variant="underline"
              tabs={[
                { label: 'Overview', value: 'overview' },
                { label: 'Courses', value: 'courses', badge: 5 },
                { label: 'Grades', value: 'grades' },
              ]}
              value={tab1}
              onChange={setTab1}
            />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Pill</p>
            <Tabs
              variant="pill"
              tabs={[
                { label: 'All', value: 'all' },
                { label: 'Active', value: 'active', badge: 3 },
                { label: 'Archived', value: 'archived' },
              ]}
              value={tab2}
              onChange={setTab2}
            />
          </div>
          <div>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8.5, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>Boxed</p>
            <Tabs
              variant="boxed"
              tabs={[
                { label: 'Active', value: 'active' },
                { label: 'Pending', value: 'pending' },
                { label: 'Closed', value: 'closed' },
              ]}
              value={tab3}
              onChange={setTab3}
            />
          </div>
        </div>
      </Section>

      <Divider style={{ margin: '48px 0' }} />

      {/* ── AVATAR ── */}
      <Section label="08" title="Avatar">
        <Row label="Sizes">
          <Avatar initials="JD" size="xs" />
          <Avatar initials="AB" size="sm" />
          <Avatar initials="SC" size="md" />
          <Avatar initials="TP" size="lg" />
          <Avatar initials="MK" size="xl" />
        </Row>
        <Row label="Shapes & Stack">
          <Avatar initials="RB" size="md" shape="square" />
          <AvatarStack>
            <Avatar initials="A" size="sm" />
            <Avatar initials="B" size="sm" />
            <Avatar initials="C" size="sm" />
            <Avatar initials="D" size="sm" />
          </AvatarStack>
        </Row>
      </Section>

      <Divider style={{ margin: '48px 0' }} />

      {/* ── SKELETON ── */}
      <Section label="09" title="Skeleton">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 400 }}>
          <Skeleton variant="line" width="60%" />
          <Skeleton variant="line" width="90%" height={14} />
          <Skeleton variant="line" width="45%" />
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
            <Skeleton variant="circle" width={40} height={40} />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
              <Skeleton variant="line" width="70%" />
              <Skeleton variant="line" width="50%" />
            </div>
          </div>
          <Skeleton variant="rect" width="100%" height={120} style={{ marginTop: 8 }} />
        </div>
      </Section>

      <Divider style={{ margin: '48px 0' }} />

      {/* ── DIVIDER & TOOLTIP ── */}
      <Section label="10" title="Divider & Tooltip">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Divider />
          <Divider strong />
          <Divider label="or continue with" />
        </div>
        <Row label="Tooltip" style={{ marginTop: 24 }}>
          <Tooltip content="View your profile">
            <Button variant="subtle" size="sm">Hover me</Button>
          </Tooltip>
          <Tooltip content="Download report">
            <Button variant="ghost" size="sm">Download</Button>
          </Tooltip>
        </Row>
      </Section>

    </div>
  );
}

function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 0 }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '.22em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 6 }}>
          {label}
        </p>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-h)', letterSpacing: '-0.02em' }}>
          {title}
        </h2>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, children, style }: { label?: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      {label && (
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '.15em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 10 }}>
          {label}
        </p>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        {children}
      </div>
    </div>
  );
}
