'use client';
import { useState, type SyntheticEvent } from 'react';
import { Button } from './ui/button';
export default function ContactForm({ email, compact = false }: { email: string; compact?: boolean }) {
  const [draft, setDraft] = useState('');
  function prepare(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    const values = new FormData(event.currentTarget);
    const body = `Name: ${values.get('firstName')} ${values.get('lastName')}\nEmail: ${values.get('Email 1')}\n\n${values.get('Message 1')}`;
    setDraft(`mailto:${email}?subject=${encodeURIComponent(String(values.get('Subject 1')))}&body=${encodeURIComponent(body)}`);
  }
  return <form className={`contact-form ${compact ? 'compact' : ''}`} onSubmit={prepare} onChange={() => { if(draft) setDraft(''); }}>
    <div className="form-name"><label>First name<input autoComplete="given-name" name="firstName" required maxLength={100} /></label><label>Last name<input autoComplete="family-name" name="lastName" required maxLength={100} /></label></div>
    <label>Email<input type="email" autoComplete="email" name="Email 1" required maxLength={254} /></label>
    <label>Subject<input name="Subject 1" required defaultValue="A 15-minute intro call" maxLength={150} /></label>
    <label>Message<textarea name="Message 1" required rows={compact ? 2 : 4} maxLength={2000} placeholder="What would you like to talk about?" /></label>
    <Button type="submit">Prepare your introduction <span aria-hidden="true">↗</span></Button>
    <p className="form-note">This prepares an email to our team in your email app. Nothing is sent until you send it. Please don’t include account details.</p>
    <noscript><p>Email <a href={`mailto:${email}`}>{email}</a> to arrange a call.</p></noscript>
    {draft && <div className="form-result" role="status"><p>Your introduction is ready.</p><a className="text-link" href={draft}>Open your email draft <span aria-hidden="true">↗</span></a><p className="form-note">No email app? Contact <a href={`mailto:${email}`}>{email}</a>.</p></div>}
  </form>;
}
