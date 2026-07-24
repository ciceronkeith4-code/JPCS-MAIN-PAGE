import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowRight, BookOpenCheck, Code2, GraduationCap, Target } from "lucide-react";
import { coreValues, programs, statistics } from "../data/content";
import { LandingIcon, Reveal, SectionHeading } from "./shared";

function AnimatedNumber({ value, suffix }: { value: number; suffix: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setDisplay(value); return; }
      const started = performance.now();
      const tick = (now: number) => {
        const progress = Math.min((now - started) / 950, 1);
        setDisplay(Math.round(value * (1 - Math.pow(1 - progress, 3))));
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: .5 });
    observer.observe(element);
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [value]);
  return <span ref={ref}>{display}{suffix}</span>;
}

export function AboutSection() {
  return (
    <section id="about" className="landing-section landing-about">
      <div className="landing-shell landing-about__grid">
        <Reveal className="landing-about__visual">
          <div className="landing-emblem" aria-hidden="true">
            <div className="landing-emblem__orbit landing-emblem__orbit--outer" /><div className="landing-emblem__orbit landing-emblem__orbit--inner" />
            <div className="landing-emblem__center"><Code2 /></div><span className="landing-emblem__node node-one">01</span><span className="landing-emblem__node node-two">JPCS</span><span className="landing-emblem__node node-three">&lt;/&gt;</span>
          </div>
          <div className="landing-about__badge"><GraduationCap /><span><strong>Student-led</strong>Professional by design</span></div>
        </Reveal>
        <Reveal className="landing-about__copy" delay={.08}>
          <SectionHeading eyebrow="01 / Overview" title="JPCS is where computing students turn curiosity into capability." />
          <p>JPCS–SSCR Manila is the campus chapter of the Junior Philippine Computer Society—a place for students to develop beyond the requirements of the classroom.</p>
          <p>Through technical learning, leadership, collaboration, and professional exposure, members build the judgment and confidence required to contribute meaningfully to a changing field.</p>
          <div className="landing-about__principles"><div><BookOpenCheck /><span><strong>Learn deeply</strong><small>Practical, peer-driven growth</small></span></div><div><Target /><span><strong>Create impact</strong><small>Purpose behind every project</small></span></div></div>
        </Reveal>
      </div>
    </section>
  );
}

const purposeItems = [
  { number: "0.1", title: "Mission", statement: "Develop technically capable, ethical, collaborative, and future-ready computing professionals.", support: "We connect academic foundations with practice, responsibility, and service." },
  { number: "0.2", title: "Vision", statement: "Become a leading student technology community connecting learning, innovation, and meaningful service.", support: "We see technology as a human discipline shaped by thoughtful people." },
  { number: "0.3", title: "Ambition", statement: "Create opportunities that move students from classroom knowledge to real-world capability.", support: "Every program should leave members more prepared to build, lead, and contribute." },
] as const;

export function PurposeSection() {
  const [activeValue, setActiveValue] = useState(0);
  return (
    <section id="mission" className="landing-section landing-purpose">
      <div className="landing-shell">
        <Reveal><SectionHeading eyebrow="02 / Purpose" title="A clear direction for the people shaping what comes next." description="Mission, vision, and ambition expressed as commitments—not slogans." /></Reveal>
        <div className="landing-purpose-index">
          {purposeItems.map((item) => <Reveal key={item.number} className="landing-purpose-index__item"><span>{item.number}</span><h3>{item.title}</h3><p>{item.statement}</p><small>{item.support}</small></Reveal>)}
        </div>
        <div className="landing-values-explorer">
          <div className="landing-values-explorer__index" role="tablist" aria-label="Core values">
            {coreValues.map((value, index) => <button key={value.title} role="tab" aria-selected={activeValue === index} className={activeValue === index ? "is-active" : ""} onClick={() => setActiveValue(index)}><small>{String(index + 1).padStart(2, "0")}</small><span>{value.title}</span><ArrowRight /></button>)}
          </div>
          <div className="landing-values-explorer__detail" role="tabpanel" tabIndex={0}>
            <span><LandingIcon name={coreValues[activeValue].icon} /></span><small>Core value {String(activeValue + 1).padStart(2, "0")}</small><h3>{coreValues[activeValue].title}</h3><p>{coreValues[activeValue].description}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

export function StatsSection() {
  return <section className="landing-stats" aria-label="Chapter impact"><div className="landing-shell landing-stats__grid">{statistics.map((stat) => <div className="landing-stat" key={stat.label}><strong><AnimatedNumber value={stat.value} suffix={stat.suffix} /></strong><span>{stat.label}</span></div>)}</div></section>;
}

export function ProgramsSection() {
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const program = programs[active];
  return (
    <section id="programs" className="landing-section landing-programs">
      <div className="landing-shell">
        <Reveal><SectionHeading eyebrow="03 / What we create" title="Experiences designed to move students beyond the classroom." description="Choose a pathway to see how members turn participation into capability." /></Reveal>
        <div className="landing-program-explorer">
          <div className="landing-program-explorer__index" role="tablist" aria-label="Programs and opportunities">
            {programs.map((item, index) => <button key={item.title} role="tab" aria-selected={active === index} className={active === index ? "is-active" : ""} onClick={() => setActive(index)}><small>{String(index + 1).padStart(2, "0")}</small><span>{item.title}</span><ArrowRight /></button>)}
          </div>
          <AnimatePresence mode="wait" initial={false}>
            <motion.article key={program.title} className="landing-program-explorer__detail" role="tabpanel" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -12 }} transition={{ duration: .28, ease: [0.22, 1, 0.36, 1] }}>
              <div><small>{program.label}</small><h3>{program.title}</h3><p>{program.description}</p><span>Student development · Applied learning</span></div>
              <div className="landing-program-explorer__visual" aria-hidden="true"><LandingIcon name={program.icon} /><i /><i /><i /><b>{String(active + 1).padStart(2, "0")}</b></div>
            </motion.article>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}