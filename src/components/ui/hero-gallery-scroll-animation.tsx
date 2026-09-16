'use client';
// Adapted from the supplied gallery concept: the covering gallery now opens on scroll.
import * as React from 'react';
import { motion, useScroll, useTransform, useMotionValueEvent, type MotionValue } from 'motion/react';
import ContactForm from '../ContactForm';
interface Photo { image: string | null; alt: string }
interface Props { headline: string; tagline: string; gallery: readonly Photo[]; email?: string; variant?: 'home' | 'page'; links?: string[][] }
const directions = [ ['-120%', '-25%'], ['120%', '-30%'], ['120%', '30%'], ['-60%', '135%'], ['45%', '135%'] ];
function BentoCell({ photo, index, progress, compact, page }: { photo: Photo; index: number; progress: MotionValue<number>; compact: boolean; page?: boolean }) {
  const pageDirections=[['-130%','-20%'],['0%','-140%'],['130%','-40%'],['0%','150%'],['-100%','130%'],['20%','150%'],['130%','80%']];
  const exit = page ? pageDirections[index] : index === 1 && compact ? ['-130%', '80%'] : directions[index];
  const x = useTransform(progress, [0, .8], ['0%', exit[0]]);
  const y = useTransform(progress, [0, .8], ['0%', exit[1]]);
  const scale = useTransform(progress, [0, .8], [1, .82]);
  return <motion.div className={`gallery-cell cell-${index}`} style={{ x, y, scale }}>
    <img src={photo.image || undefined} alt={photo.alt} width={index === 0 ? 1600 : 800} height={1000} fetchPriority={index === 0 ? 'high' : 'auto'} decoding="async" />
  </motion.div>;
}
export default function HeroGallery({ headline, tagline, gallery, email = '', variant = 'home', links }: Props) {
  const container = React.useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: container, offset: ['start start', variant === 'page' ? 'end 70%' : 'end end'] });
  // Functional transforms keep opacity on the same measured timeline as the tiles.
  const titleOpacity = useTransform(scrollYProgress, value => Math.max(0, 1 - (variant === 'page' ? Math.max(0,value-.15)/.55 : value/.18)));
  const revealOpacity = useTransform(scrollYProgress, value => Math.min(1, Math.max(0, (value - .15) / (variant === 'page' ? .55 : .4))));
  const revealScale = useTransform(scrollYProgress, value => .94 + .06 * Math.min(1, Math.max(0, (value - .15) / .5)));
  const [accessible, setAccessible] = React.useState(false);
  const [reduced, setReduced] = React.useState(false);
  const [compact, setCompact] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);
  React.useEffect(() => {
    setHydrated(true);
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const mobile = window.matchMedia('(max-width: 640px)');
    const update = () => { setReduced(media.matches); setCompact(mobile.matches); }; update();
    mobile.addEventListener('change', update);
    media.addEventListener('change', update); return () => { media.removeEventListener('change', update); mobile.removeEventListener('change', update); };
  }, []);
  useMotionValueEvent(scrollYProgress, 'change', value => setAccessible(value >= .6));
  return <section className={`hero-scroll ${variant === 'page' ? 'inner-hero' : ''}`} ref={container} aria-label={variant === 'page' ? headline : 'Investing for generations'}>
    <span className="connect-anchor" id={variant === 'page' ? 'page-intro' : 'connect'} />
    <div className="hero-stage">
      <motion.div className="hero-reveal" style={reduced ? {} : { opacity: revealOpacity, scale: variant === 'page' ? 1 : revealScale }} inert={variant === 'home' && hydrated && !accessible && !reduced}>
        {variant === 'page' ? <div className="page-headline"><h1>{headline}</h1>{tagline && <p>{tagline}</p>}{links && <nav inert={hydrated && !accessible && !reduced} aria-label={`${headline} pages`}>{links.map(([label,url])=><a key={url} href={url}>{label} ↗</a>)}</nav>}</div> : <><div className="reveal-intro"><span className="eyebrow">Investing for generations</span><h2>Start with <br />a conversation.</h2><p>Take 15 minutes to meet your team and share your financial goals.</p><a className="text-link" href="/start-here">What to expect <span aria-hidden="true">↗</span></a></div>
        <div className="reveal-form"><ContactForm email={email} compact /></div></>}
      </motion.div>
      <div className="hero-gallery" aria-hidden="true">{gallery.map((photo, index) => <BentoCell key={index} photo={photo} index={index} progress={scrollYProgress} compact={compact} page={variant === 'page'} />)}</div>
      {variant === 'page' && <motion.div className="hero-cover-copy page-cover-copy" aria-hidden="true" style={reduced ? {} : {opacity:titleOpacity}}><div className="page-headline"><div className="page-cover-heading">{headline}</div>{tagline && <p>{tagline}</p>}{links && <div className="page-cover-links">{links.map(([label,url])=><span key={url}>{label} ↗</span>)}</div>}</div></motion.div>}
      {variant === 'home' && <motion.div className="hero-cover-copy" style={reduced ? {} : { opacity: titleOpacity }}>
        <span className="hero-kicker">Investing for generations</span><h1>{headline}</h1><p>{tagline}</p>
      </motion.div>}
      <motion.a className="scroll-cue" href={variant === 'page' ? '#page-intro' : '#connect'} tabIndex={accessible ? -1 : 0} style={reduced ? {} : { opacity: titleOpacity }}>{variant === 'page' ? 'Scroll to explore' : 'Scroll to open your next chapter'} <span aria-hidden="true">↓</span></motion.a>
    </div>
  </section>;
}
