import { useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowDown, ArrowRight } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useHeroParallax } from "../hooks/useLandingMotion";
import { scrollToLandingSection } from "./shared";

const topics = ["Leadership", "Innovation", "Community"];

export function HeroSection() {
  const heroRef = useRef<HTMLElement>(null);
  const reduceMotion = useReducedMotion();
  useHeroParallax(heroRef);

  return (
    <section id="home" ref={heroRef} className="landing-hero landing-hero--editorial">
      <div className="landing-hero__coordinates" aria-hidden="true"><span>14.5995° N</span><span>120.9842° E</span></div>
      <div className="landing-hero__signal" data-parallax-depth="0.7" aria-hidden="true">
        <span className="signal-ring signal-ring--one" /><span className="signal-ring signal-ring--two" /><span className="signal-ring signal-ring--three" />
        <span className="signal-axis signal-axis--x" /><span className="signal-axis signal-axis--y" /><span className="signal-core">JPCS</span>
        <i className="signal-node signal-node--one" /><i className="signal-node signal-node--two" /><i className="signal-node signal-node--three" />
      </div>

      <div className="landing-shell landing-hero__editorial-inner">
        <motion.div className="landing-hero__edition" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.45 }}>
          <span>JPCS · SSCR MANILA</span><span>CHAPTER 2026</span>
        </motion.div>
        <motion.div className="landing-hero__statement" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 26 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}>
          <span className="landing-hero__overline">Junior Philippine Computer Society</span>
          <h1><span>Empowering the next generation</span><span>of computing professionals.</span></h1>
        </motion.div>
        <motion.div className="landing-hero__summary" initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.65, delay: 0.18, ease: [0.22, 1, 0.36, 1] }}>
          <span>Student-led · Future-facing</span>
          <p>A student-led community advancing leadership, innovation, technical excellence, and meaningful collaboration at San Sebastian College-Recoletos Manila.</p>
          <div className="landing-hero__topics">{topics.map((topic, index) => <motion.span key={topic} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .3 + index * .08 }}>{topic}</motion.span>)}</div>
        </motion.div>
      </div>

      <div className="landing-shell landing-hero__rail">
        <Link to="/login"><span><small>01</small>Sign In to Portal</span><ArrowRight /></Link>
        <button onClick={() => scrollToLandingSection("#about")}><span><small>02</small>Discover the chapter</span><ArrowDown /></button>
      </div>
    </section>
  );
}
