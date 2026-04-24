'use client';

import React from 'react';

import { useToast } from '@/components/providers/ToastProvider';
import { Alert, Button, Input, Textarea } from '@/components/ui';
import { getErrorMessage, submitPublicContactMessage } from '@/lib/api-client';

export function MarketingContactForm() {
  const { showToast } = useToast();
  const [fullName, setFullName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await submitPublicContactMessage({
        fullName: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || undefined,
        title: title.trim(),
        message: message.trim(),
      });
      showToast('success', 'Message sent', res.acknowledgement);
      setFullName('');
      setEmail('');
      setPhone('');
      setTitle('');
      setMessage('');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 18 }}>
      {error ? <Alert variant="error">{error}</Alert> : null}
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.65, color: 'var(--text-muted)' }}>
        This form is public. You can send a message while logged out; we only use your details to respond to this
        enquiry.
      </p>
      <div
        style={{
          display: 'grid',
          gap: 14,
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        }}
      >
        <Input
          id="contact-full-name"
          label="Full name"
          name="fullName"
          autoComplete="name"
          required
          value={fullName}
          onChange={(ev) => setFullName(ev.target.value)}
          maxLength={200}
        />
        <Input
          id="contact-email"
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(ev) => setEmail(ev.target.value)}
          maxLength={320}
        />
        <Input
          id="contact-phone"
          label="Phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={(ev) => setPhone(ev.target.value)}
          maxLength={50}
        />
        <Input
          id="contact-title"
          label="Title"
          name="title"
          required
          value={title}
          onChange={(ev) => setTitle(ev.target.value)}
          maxLength={300}
          placeholder="What is this about?"
        />
      </div>
      <Textarea
        id="contact-message"
        label="Message"
        name="message"
        required
        rows={6}
        value={message}
        onChange={(ev) => setMessage(ev.target.value)}
        maxLength={8000}
        hint={`${message.length} / 8000`}
      />
      <Button type="submit" size="lg" disabled={submitting} style={{ justifySelf: 'stretch' }}>
        {submitting ? 'Sending…' : 'Send message'}
      </Button>
    </form>
  );
}
