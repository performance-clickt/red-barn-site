'use client';
import { useRef, useState, type SyntheticEvent } from 'react';
import { Button } from './ui/button';
export default function ContactForm({ email, compact = false }: { email: string; compact?: boolean }) {
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');
  const pending = useRef(false);
  const submission = useRef<{ payload: string; key: string } | null>(null);
  async function submit(event: SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    const form = event.currentTarget;
    const payload = JSON.stringify(Object.fromEntries(new FormData(form)));
    if (submission.current?.payload !== payload) submission.current = { payload, key: crypto.randomUUID() };
    pending.current = true;
    setState('sending');
    try {
      const response = await fetch('/api/enquiries', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': submission.current.key },
        body: payload, signal: AbortSignal.timeout(25000),
      });
      const result = await response.json();
      if (!response.ok || result.success !== true) throw new Error(result.error || 'We couldn’t confirm receipt. Please try again.');
      setState('success');
      form.reset();
    } catch (problem) {
      setError(problem instanceof Error && problem.name === 'Error' ? problem.message : 'We couldn’t confirm receipt. Please try again, or contact our team directly.');
      setState('error');
    } finally { pending.current = false; }
  }
  return <form className={`contact-form ${compact ? 'compact' : ''}`} onSubmit={submit} aria-busy={state === 'sending'} onChange={() => { if (state !== 'sending') setState('idle'); }}>
    <div className="form-name"><label>First name<input autoComplete="given-name" name="firstName" required maxLength={100} readOnly={state === 'sending'} /></label><label>Last name<input autoComplete="family-name" name="lastName" required maxLength={100} readOnly={state === 'sending'} /></label></div>
    <label>Email<input type="email" autoComplete="email" name="email" required maxLength={254} readOnly={state === 'sending'} /></label>
    <label>Subject<input name="subject" required defaultValue="A 15-minute intro call" maxLength={150} readOnly={state === 'sending'} /></label>
    <label>Message<textarea name="message" required rows={compact ? 2 : 4} maxLength={2000} placeholder="What would you like to talk about?" readOnly={state === 'sending'} /></label>
    <div hidden aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
    <Button type="submit" disabled={state === 'sending' || state === 'success'}>{state === 'sending' ? 'Sending your request…' : state === 'success' ? 'Request received' : 'Request an intro call'} <span aria-hidden="true">↗</span></Button>
    <p className="form-note">Our team will be in touch to arrange a conversation. Please don’t include account details.</p>
    <noscript><p>Enable JavaScript to submit this form, or contact <a href={`mailto:${email}`}>{email}</a>.</p></noscript>
    {state === 'success' && <div className="form-result" role="status"><p>Thank you. Your request has been received.</p><p className="form-note">We’ll be in touch to arrange your intro call.</p></div>}
    {state === 'error' && <div className="form-result" role="alert"><p>{error}</p><p className="form-note">You can also reach us at <a href={`mailto:${email}`}>{email}</a>.</p></div>}
  </form>;
}
