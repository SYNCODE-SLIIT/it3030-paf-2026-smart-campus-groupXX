'use client';

import React from 'react';
import {
  Avatar,
  Badge,
  Button,
  Card,
  Chip,
  Divider,
  Progress,
} from '@/components/ui';

// ── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  label,
  value,
  change,
  changeType,
  icon,
  accentColor,
}: {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  accentColor: string;
}) {
  const changeColor =
    changeType === 'up'
      ? 'var(--green-500)'
      : changeType === 'down'
      ? 'var(--red-500)'
      : 'var(--text-muted)';

  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '.18em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 8,
            }}
          >
            {label}
          </p>
          <p
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 28,
              fontWeight: 700,
              color: 'var(--text-h)',
              lineHeight: 1,
              marginBottom: 8,
            }}
          >
            {value}
          </p>
          {change && (
            <p style={{ fontSize: 11, color: changeColor, fontWeight: 600 }}>{change}</p>
          )}
        </div>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 'var(--radius-md)',
            background: accentColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
      </div>
    </Card>
  );
}

// ── Activity Item ─────────────────────────────────────────────────────────────
function ActivityItem({
  initials,
  name,
  action,
  time,
  chipColor,
  chipLabel,
}: {
  initials: string;
  name: string;
  action: string;
  time: string;
  chipColor: 'yellow' | 'green' | 'blue' | 'red' | 'orange' | 'neutral';
  chipLabel: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '10px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <Avatar initials={initials} size="sm" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: 'var(--text-h)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </p>
        <p
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {action}
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
        <Chip color={chipColor} size="sm">
          {chipLabel}
        </Chip>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{time}</span>
      </div>
    </div>
  );
}

// ── Quick Action Button ───────────────────────────────────────────────────────
function QuickAction({
  icon,
  label,
  variant,
}: {
  icon: React.ReactNode;
  label: string;
  variant: 'primary' | 'subtle' | 'success' | 'info' | 'danger';
}) {
  return (
    <Button
      variant={variant}
      size="md"
      iconLeft={icon}
      style={{ flex: 1, justifyContent: 'center' }}
    >
      {label}
    </Button>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function AdminDashboard() {
  return (
    <div
      style={{
        maxWidth: 1200,
        margin: '0 auto',
        padding: '40px 24px 80px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}
    >
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <p
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '.2em',
              textTransform: 'uppercase',
              color: 'var(--text-muted)',
              marginBottom: 4,
            }}
          >
            Smart Campus · Admin
          </p>
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 26,
              fontWeight: 700,
              color: 'var(--text-h)',
              letterSpacing: '-0.03em',
            }}
          >
            Dashboard
          </h1>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Chip color="green" dot>
            System Online
          </Chip>
          <Button variant="primary" size="sm">
            + New Announcement
          </Button>
        </div>
      </div>

      <Divider />

      {/* ── Stats Row ── */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
        <StatCard
          label="Total Students"
          value="3,842"
          change="↑ 124 this month"
          changeType="up"
          accentColor="var(--yellow-100)"
          icon={
            <svg width="20" height="20" fill="none" stroke="var(--yellow-600)" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <StatCard
          label="Active Courses"
          value="48"
          change="↑ 6 new this term"
          changeType="up"
          accentColor="var(--blue-50)"
          icon={
            <svg width="20" height="20" fill="none" stroke="var(--blue-500)" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          }
        />
        <StatCard
          label="Faculty Members"
          value="187"
          change="→ No change"
          changeType="neutral"
          accentColor="var(--green-50)"
          icon={
            <svg width="20" height="20" fill="none" stroke="var(--green-500)" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
            </svg>
          }
        />
        <StatCard
          label="Upcoming Events"
          value="12"
          change="↓ 3 cancelled"
          changeType="down"
          accentColor="var(--orange-50)"
          icon={
            <svg width="20" height="20" fill="none" stroke="var(--orange-500)" strokeWidth="2" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
      </div>

      {/* ── Quick Actions ── */}
      <Card>
        <p
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '.18em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            marginBottom: 14,
          }}
        >
          Quick Actions
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <QuickAction
            variant="primary"
            label="Enroll Student"
            icon={
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <line x1="19" y1="8" x2="19" y2="14" />
                <line x1="22" y1="11" x2="16" y2="11" />
              </svg>
            }
          />
          <QuickAction
            variant="info"
            label="Add Course"
            icon={
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M12 5v14M5 12h14" />
              </svg>
            }
          />
          <QuickAction
            variant="success"
            label="Generate Report"
            icon={
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            }
          />
          <QuickAction
            variant="subtle"
            label="Manage Rooms"
            icon={
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
            }
          />
          <QuickAction
            variant="danger"
            label="Send Alert"
            icon={
              <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" viewBox="0 0 24 24">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
            }
          />
        </div>
      </Card>

      {/* ── Bottom Two-Column Layout ── */}
      <div
        style={{
          display: 'grid',
          /*
           * minmax(0, 1fr) lets the left column shrink below its content size
           * so it doesn't overflow on narrow viewports.
           * minmax(280px, 380px) keeps the right column between 280 px and
           * 380 px, making it responsive without a media query.
           */
          gridTemplateColumns: 'minmax(0, 1fr) minmax(280px, 380px)',
          gap: 16,
          /*
           * flex-start prevents grid items from stretching to match the tallest
           * sibling — the root cause of the empty-space issue after the
           * Recent Activity card.
           */
          alignItems: 'flex-start',
        }}
      >
        {/* Recent Activity */}
        <Card>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 4,
            }}
          >
            <div>
              <p
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 9,
                  letterSpacing: '.18em',
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  marginBottom: 2,
                }}
              >
                Recent Activity
              </p>
              <h2
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 16,
                  fontWeight: 700,
                  color: 'var(--text-h)',
                }}
              >
                Latest Events
              </h2>
            </div>
            <Badge color="yellow">8 new</Badge>
          </div>

          <div style={{ marginTop: 8 }}>
            <ActivityItem
              initials="JD"
              name="Jane Doe"
              action="Enrolled in COMP3030 — Advanced Algorithms"
              time="2 min ago"
              chipColor="green"
              chipLabel="Enrolment"
            />
            <ActivityItem
              initials="MS"
              name="Mr. Silva"
              action="Created new course: Data Structures 201"
              time="14 min ago"
              chipColor="blue"
              chipLabel="Course"
            />
            <ActivityItem
              initials="AP"
              name="Admin Portal"
              action="System maintenance scheduled for Friday 18:00"
              time="1 hr ago"
              chipColor="orange"
              chipLabel="System"
            />
            <ActivityItem
              initials="RP"
              name="Raj Perera"
              action="Submitted assignment for MATH2010"
              time="2 hr ago"
              chipColor="neutral"
              chipLabel="Assignment"
            />
            <ActivityItem
              initials="KF"
              name="Karen Fernando"
              action="Grade updated: PHYS1001 — 87/100"
              time="3 hr ago"
              chipColor="green"
              chipLabel="Grade"
            />
            <ActivityItem
              initials="TW"
              name="Tom Wijesinghe"
              action="Room LH-204 booked for CS workshop"
              time="5 hr ago"
              chipColor="yellow"
              chipLabel="Booking"
            />
            <ActivityItem
              initials="NR"
              name="Nimal Rathnayake"
              action="New leave request pending approval"
              time="Yesterday"
              chipColor="red"
              chipLabel="Leave"
            />
          </div>

          <div style={{ marginTop: 16 }}>
            <Button variant="ghost" size="sm" fullWidth>
              View All Activity
            </Button>
          </div>
        </Card>

        {/* Right column: System Status + Announcements stacked */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* System Status */}
          <Card>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 2,
              }}
            >
              System Status
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-h)',
                marginBottom: 16,
              }}
            >
              Resource Usage
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Progress value={68} label="Server CPU" showValue color="yellow" size="sm" />
              <Progress value={42} label="Memory" showValue color="blue" size="sm" />
              <Progress value={81} label="Storage" showValue color="red" size="sm" />
              <Progress value={23} label="Network" showValue color="green" size="sm" />
            </div>
          </Card>

          {/* Announcements */}
          <Card>
            <p
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 9,
                letterSpacing: '.18em',
                textTransform: 'uppercase',
                color: 'var(--text-muted)',
                marginBottom: 2,
              }}
            >
              Pinned
            </p>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 16,
                fontWeight: 700,
                color: 'var(--text-h)',
                marginBottom: 14,
              }}
            >
              Announcements
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                {
                  title: 'Library closure Friday',
                  desc: 'The library will close at 18:00 for maintenance.',
                  color: 'orange' as const,
                  label: 'Notice',
                },
                {
                  title: 'New semester enrolment open',
                  desc: 'Students can now enrol for Semester 2 courses.',
                  color: 'green' as const,
                  label: 'Info',
                },
                {
                  title: 'Exam timetable published',
                  desc: 'Final exam schedule is now available on the portal.',
                  color: 'blue' as const,
                  label: 'Exam',
                },
              ].map((a) => (
                <div
                  key={a.title}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    background: 'var(--bg-subtle)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: 4,
                    }}
                  >
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        color: 'var(--text-h)',
                      }}
                    >
                      {a.title}
                    </p>
                    <Chip color={a.color} size="sm">
                      {a.label}
                    </Chip>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5 }}>
                    {a.desc}
                  </p>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14 }}>
              <Button variant="ghost-accent" size="sm" fullWidth>
                Manage Announcements
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
