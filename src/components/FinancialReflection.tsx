import { useEffect, useRef, useState, type SyntheticEvent } from 'react';
import { Button } from './ui/button';
import content from '../lib/reflection/content.json';
import { calculateReflection } from '../lib/reflection/score';
import '../styles/reflection.css';

export default function FinancialReflection({ heroImage }: { heroImage?: { src?: string; srcSet?: string; sizes?: string } }) {
  const [step, setStep] = useState(-1);
  const [name, setName] = useState('');
  const [answers, setAnswers] = useState<(number | null)[]>(Array(12).fill(null));
  const [pdfState, setPdfState] = useState<'idle' | 'working' | 'error' | 'done'>('idle');
  const focusTarget = useRef<HTMLHeadingElement>(null);
  const hasNavigated = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    if (hasNavigated.current) focusTarget.current?.focus();
    hasNavigated.current = true;
  }, [step]);
  const result = step === 12 ? calculateReflection(answers as number[]) : null;
  const question = step >= 0 && step < 12 ? content.questions[step] : null;
  function start(event: SyntheticEvent) { event.preventDefault(); setStep(0); }
  function restart() {
    generation.current++;
    setName(''); setAnswers(Array(12).fill(null)); setPdfState('idle'); setStep(-1);
  }
  async function download() {
    if (!result || pdfState === 'working') return;
    const current = generation.current;
    setPdfState('working');
    try {
      const [{ createReflectionPdf }, response] = await Promise.all([
        import('../lib/reflection/pdf'), fetch('/fonts/reflection-work-sans-400.woff'),
      ]);
      if (!response.ok) throw new Error('Font unavailable');
      const bytes = await createReflectionPdf(result, name, new Uint8Array(await response.arrayBuffer()));
      if (generation.current !== current) return;
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url; link.download = `red-barn-financial-values-${result.archetype.id}.pdf`;
      document.body.append(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 30000);
      setPdfState('done');
    } catch { if (generation.current === current) setPdfState('error'); }
  }
  const intro = content.introduction;
  const labels = content.resultLabels;
  return <section className="reflection" aria-label="Financial Values Reflection">
    {step === -1 && <div className="reflection-intro">
      <div className="reflection-intro-copy">
        <h1 tabIndex={-1} ref={focusTarget}>{intro.title}</h1>
        <p className="reflection-lead">{intro.subhead}</p>
        <p>{intro.body}</p>
        <ul className="reflection-benefits">{intro.benefits.map((benefit, i) => <li key={benefit}><span aria-hidden="true">0{i + 1}</span>{benefit}</li>)}</ul>
      </div>
      <div className="reflection-intro-panel">
        <img {...heroImage} src={heroImage?.src || "/images/pages/financial-reflection/heroImage.webp"} alt="A family sharing a conversation at home." width={900} height={600} />
        <form onSubmit={start} className="reflection-entry">
          <label htmlFor="reflection-name">{intro.nameLabel}</label>
          <input id="reflection-name" value={name} onChange={e => setName(e.target.value)} autoComplete="name" maxLength={100} placeholder={intro.namePlaceholder} />
          <label htmlFor="reflection-email">{intro.emailLabel}</label>
          <input id="reflection-email" type="email" placeholder={intro.emailPlaceholder} disabled aria-describedby="reflection-email-note" />
          <p id="reflection-email-note" className="reflection-note">Email delivery is not available yet. No email address is needed to view or download your results.</p>
          <Button type="submit">{intro.startLabel}</Button>
          <p className="reflection-note">Your name and answers stay in this page. Nothing is submitted to Red Barn or added to a mailing list. Restarting or reloading clears your reflection.</p>
        </form>
      </div>
    </div>}
    {question && <div className="reflection-question">
      <div className="reflection-progress-label"><span>Question {step + 1} of 12</span><span>{step + 1}/12</span></div>
      <progress value={step + 1} max={12} aria-label="Reflection progress">{Math.round((step + 1) / 12 * 100)}%</progress>
      <div className="reflection-question-meta"><span className="reflection-eyebrow">{content.themes.find(t => t.id === question.theme)!.name}</span><span>{Math.round((step + 1) / 12 * 100)}%</span></div>
      <h1 tabIndex={-1} ref={focusTarget} id="reflection-question-title">{question.text}</h1>
      <p className="reflection-instructions" id="reflection-instructions">{intro.instructions}</p>
      <fieldset aria-labelledby="reflection-question-title" aria-describedby="reflection-instructions" className="reflection-answers" key={question.id}>
        <legend className="reflection-sr-only">Choose one answer</legend>
        {content.options.map(option => <label key={option.value} className={answers[step] === option.value ? 'is-selected' : ''}>
          <input type="radio" name={question.id} value={option.value} checked={answers[step] === option.value} onChange={() => setAnswers(previous => previous.map((value, i) => i === step ? option.value : value))} />
          <span className="reflection-answer-value" aria-hidden="true">{option.value}</span><span>{option.label}</span>
        </label>)}
      </fieldset>
      <div className="reflection-question-nav">{step > 0 ? <Button variant="outline" onClick={() => setStep(step - 1)}>← Back</Button> : <span />}<Button disabled={answers[step] === null} onClick={() => setStep(step + 1)}>Next →</Button></div>
    </div>}
    {result && <div className="reflection-results">
      <header className="reflection-result-heading"><p className="reflection-eyebrow">{labels.status}</p><h1 ref={focusTarget} tabIndex={-1}>{labels.title}</h1>{name.trim() && <p className="reflection-person">{name.trim()}</p>}</header>
      <section className="reflection-archetype" aria-labelledby="archetype-title"><div><p className="reflection-eyebrow">{labels.archetype}</p><h2 id="archetype-title">{result.archetype.name}</h2><p className="reflection-lead">{result.archetype.tagline}</p><ul className="reflection-theme-tags">{result.archetype.themes.map(id => <li key={id}>{content.themes.find(t => t.id === id)!.name}</li>)}</ul></div><div><h3>{labels.summary}</h3><p>{result.archetype.summary}</p></div></section>
      <div className="reflection-prompts">{(['selfQuestions', 'familyQuestions'] as const).map(kind => <section key={kind}><h2>{labels[kind]}</h2><ol>{result.archetype[kind].map(q => <li key={q}>{q}</li>)}</ol></section>)}</div>
      <section className="reflection-scores" aria-labelledby="reflection-scores-title"><h2 id="reflection-scores-title">{labels.scores}</h2><dl>{result.themes.map(theme => <div key={theme.id}><dt>{theme.name}<small>{theme.description}</small></dt><dd>{theme.display}<span>/5</span><meter min={0} max={5} value={theme.average} aria-label={theme.name} /></dd></div>)}</dl><p className="reflection-overall">{labels.overall}<strong>{result.overallDisplay}/5</strong></p></section>
      <section className="reflection-agenda" aria-labelledby="reflection-agenda-title"><h2 id="reflection-agenda-title">{labels.agenda}</h2><p className="reflection-lead">{labels.agendaSubtitle}</p><ol>{content.agenda.map(item => <li key={item.segment}><div><h3>{item.segment}</h3><span>{item.duration}</span></div><p>{item.purpose}</p></li>)}</ol></section>
      <section className="reflection-next"><h2>{labels.nextSteps}</h2><ol>{content.nextSteps.map(step => <li key={step}>{step}</li>)}</ol><a className="text-link" href="/start-here">Start a conversation <span aria-hidden="true">↗</span></a></section>
      <div className="reflection-actions"><Button onClick={download} disabled={pdfState === 'working'}>{pdfState === 'working' ? 'Preparing PDF…' : content.actions[0]}</Button><Button variant="outline" disabled aria-describedby="reflection-delivery-note">{content.actions[1]}</Button><Button variant="link" onClick={restart}>{content.actions[2]}</Button></div>
      <p className="reflection-note" id="reflection-delivery-note">Email delivery is not available yet. You can download your results as a PDF. This reflection has not been sent to Red Barn.</p>
      <p role="status" className="reflection-note">{pdfState === 'done' ? 'Your PDF is ready. Check your downloads.' : pdfState === 'error' ? 'We couldn’t create your PDF. Please try again. Your results are still here.' : ''}</p>
    </div>}
    <footer className="reflection-footer">{content.footer}</footer>
    <noscript><p>This reflection needs JavaScript to calculate your results. Enable JavaScript and reload this page.</p></noscript>
  </section>;
}
