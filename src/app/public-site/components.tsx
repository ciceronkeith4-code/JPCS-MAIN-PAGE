import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { ArrowRight, Check, ChevronUp, Code2, HeartHandshake, Menu, Network, Sparkles, Users, X } from "lucide-react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { footerGroups, navigation, type Feature } from "./data";
import "./site.css";

gsap.registerPlugin(ScrollTrigger);

type SeoData = { title: string; description: string; path: string };

export function Seo({ title, description, path }: SeoData) {
  useEffect(() => {
    document.title = title;
    const setMeta = (selector: string, attribute: string, value: string) => {
      let element = document.head.querySelector<HTMLMetaElement>(selector);
      if (!element) {
        element = document.createElement("meta");
        const match = selector.match(/\[(name|property)="([^"]+)"\]/);
        if (match) element.setAttribute(match[1], match[2]);
        document.head.appendChild(element);
      }
      element.setAttribute(attribute, value);
    };
    setMeta('meta[name="description"]', "content", description);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", `https://example.com${path}`);
    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `https://example.com${path}`;
  }, [description, path, title]);
  return null;
}

export function RollingText({ children }: { children: string }) {
  return <span className="site-rolling" aria-label={children}><span aria-hidden="true">{children}</span><span aria-hidden="true">{children}</span></span>;
}

export function SiteLink({ to, className, children, onClick }: { to: string; className?: string; children: ReactNode; onClick?: () => void }) {
  return <Link to={to} className={className} onClick={onClick}>{children}</Link>;
}

export function AnimatedButton({ to, children, variant = "primary", className = "" }: { to: string; children: string; variant?: "primary" | "outline" | "light" | "dark" | "text"; className?: string }) {
  return (
    <motion.div className={`site-button-wrap ${className}`} whileTap={{ scale: 0.98 }}>
      <SiteLink to={to} className={`site-button site-button--${variant}`}>
        <RollingText>{children}</RollingText><ArrowRight aria-hidden="true" />
      </SiteLink>
    </motion.div>
  );
}

function Logo() {
  return (
    <SiteLink to="/" className="site-logo">
      <img src="/sscr-logo.png" width="48" height="48" alt="SSCR Logo" />
      <img src="/jpcs-logo.png" width="48" height="48" alt="JPCS Logo" />
      <span>
        <strong className="logo-text-full">IT DEPARTMENT OF SSCR MANILA</strong>
        <strong className="logo-text-short">JPCS</strong>
        <small>JPCS | SSCR MANILA CHAPTER</small>
      </span>
    </SiteLink>
  );
}

export function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const reduce = useReducedMotion();
  return (
    <motion.div className={className} initial={{ opacity: 0, y: reduce ? 0 : 28 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.18 }} transition={{ duration: reduce ? 0.15 : 0.68, delay, ease: [0.22, 1, 0.36, 1] }}>
      {children}
    </motion.div>
  );
}

export function ImagePlaceholder({ label, file, className = "", priority = false }: { label: string; file: string; className?: string; priority?: boolean }) {
  const frame = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  useEffect(() => {
    if (reduce || !frame.current) return;
    const context = gsap.context(() => {
      const inner = frame.current?.querySelector(".site-image-placeholder__inner");
      if (!inner) return;
      gsap.fromTo(inner, { yPercent: -5 }, { yPercent: 5, ease: "none", scrollTrigger: { trigger: frame.current, start: "top bottom", end: "bottom top", scrub: 0.7 } });
    }, frame);
    return () => context.revert();
  }, [reduce]);
  return (
    <div ref={frame} className={`site-image-placeholder ${className}`} role="img" aria-label={label} data-priority={priority || undefined}>
      <img 
        src={`/images/${file}`} 
        alt={label} 
        className="absolute inset-0 w-full h-full object-cover z-10" 
        onError={(e) => { e.currentTarget.style.display = 'none'; }} 
      />
      <div className="site-image-placeholder__inner" />
      <span className="relative z-0">{label}</span>
      <small className="relative z-0">Replace with /images/{file}</small>
    </div>
  );
}

export function SectionHeading({ eyebrow, title, copy, align = "left" }: { eyebrow: string; title: string; copy?: string; align?: "left" | "center" }) {
  return (
    <Reveal className={`site-section-heading site-section-heading--${align}`}>
      <span className="site-eyebrow">{eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}
    </Reveal>
  );
}

export function FeatureRow({ feature, index }: { feature: Feature; index: number }) {
  return (
    <article className={`site-feature-row${index % 2 ? " is-reversed" : ""}`}>
      <Reveal className="site-feature-row__visual"><ImagePlaceholder label={feature.imageLabel} file={feature.imageFile} /></Reveal>
      <Reveal className="site-feature-row__copy" delay={0.08}>
        <span className="site-eyebrow">{feature.eyebrow}</span><h3>{feature.title}</h3><p>{feature.description}</p>
        <ul>{feature.details.map((detail) => <li key={detail}><Check aria-hidden="true" />{detail}</li>)}</ul>
      </Reveal>
    </article>
  );
}

export const benefitIcons = { code: Code2, lead: Users, connect: Network, impact: HeartHandshake } as const;

function MobileMenu({ open, close }: { open: boolean; close: () => void }) {
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    document.body.classList.add("site-menu-open");
    const timer = window.setTimeout(() => panel.current?.querySelector<HTMLElement>("a")?.focus(), 40);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab" || !panel.current) return;
      const focusable = Array.from(panel.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled])'));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      window.clearTimeout(timer);
      document.body.classList.remove("site-menu-open");
      document.removeEventListener("keydown", handleKey);
      previous?.focus();
    };
  }, [close, open]);
  return (
    <AnimatePresence>
      {open && (
        <motion.div ref={panel} className="site-mobile-menu" id="site-mobile-menu" role="dialog" aria-modal="true" aria-label="Site navigation" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.22 }}>
          <div className="site-mobile-menu__top"><Logo /><button type="button" onClick={close} aria-label="Close menu"><X /></button></div>
          <nav aria-label="Mobile navigation">
            {navigation.map((item, index) => <motion.div key={item.to} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 + index * 0.05 }}><SiteLink to={item.to} onClick={close}><span>0{index + 1}</span>{item.label}</SiteLink></motion.div>)}
          </nav>
          <div className="site-mobile-menu__bottom">
            <div className="site-mobile-menu__actions">
              <AnimatedButton to="/login" variant="outline">Member Login</AnimatedButton>
            </div>
            <p>Official email: jpcssscrmnl@gmail.com</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update(); window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);
  return (
    <>
      <header className={`site-header${scrolled ? " is-scrolled" : ""}`}>
        <div className="site-shell site-header__inner">
          <Logo />
          <nav className="site-nav" aria-label="Main navigation">
            {navigation.map((item) => <NavLink key={item.to} to={item.to} end={item.to === "/"} className={({ isActive }) => isActive && !item.to.includes("#") ? "is-active" : undefined}><RollingText>{item.label}</RollingText></NavLink>)}
          </nav>
          <div className="site-header__actions">
            <AnimatedButton to="/login">LOGIN</AnimatedButton>
          </div>
          <button className="site-menu-button" type="button" onClick={() => setMenuOpen(true)} aria-expanded={menuOpen} aria-controls="site-mobile-menu" aria-label="Open menu"><Menu /></button>
        </div>
      </header>
      <MobileMenu open={menuOpen} close={() => setMenuOpen(false)} />
    </>
  );
}

export function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="site-shell">
        <div className="site-footer__top">
          <div className="site-footer__brand"><Logo /><p>A student-led technology community developing future computing professionals through learning, leadership, innovation, and service.</p></div>
          {footerGroups.map((group) => <div className="site-footer__group" key={group.title}><h3>{group.title}</h3>{group.links.map((link) => <SiteLink to={link.to} key={link.label}>{link.label}</SiteLink>)}</div>)}
          <div className="site-footer__group">
            <h3>Contact</h3>
            <a href="mailto:jpcssscrmnl@gmail.com">jpcssscrmnl@gmail.com</a>
            <span className="text-slate-300">JPCS- SSCR Manila Chapter</span>
            <span>San Sebastian College–Recoletos Manila</span>
          </div>
        </div>
        <div className="site-footer__bottom"><span>© {new Date().getFullYear()} JPCS–SSCR Manila</span><div><span>Privacy placeholder</span><span>Terms placeholder</span></div><button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Back to top"><ChevronUp /></button></div>
      </div>
    </footer>
  );
}

export function IntroPreloader({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 5000; // 5 seconds loading duration
    const intervalTime = 20;
    const step = 100 / (duration / intervalTime);

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setTimeout(onComplete, 180);
          return 100;
        }
        return prev + step;
      });
    }, intervalTime);

    return () => clearInterval(timer);
  }, [onComplete]);

  return (
    <motion.div
      className="site-intro-overlay"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="site-intro-content">
        <motion.div
          className="site-intro-line"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
        <motion.div
          className="site-intro-logos"
          initial={{ opacity: 0, scale: 0.85, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          style={{ display: "flex", gap: "16px", marginBlock: "2rem 1.5rem" }}
        >
          <img src="/sscr-logo.png" alt="SSCR Logo" style={{ width: "80px", height: "80px", objectFit: "contain" }} />
          <img src="/jpcs-logo.png" alt="JPCS Logo" style={{ width: "80px", height: "80px", objectFit: "contain" }} />
        </motion.div>
        <motion.div
          className="site-intro-titles"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
        >
          <h2>IT Department of SSCR Manila</h2>
          <p>JPCS | SSCR Manila Chapter</p>
        </motion.div>
        <div className="site-intro-progress">
          <div className="site-intro-progress-bar" style={{ width: `${progress}%` }} />
        </div>
      </div>
      <button className="site-intro-skip" type="button" onClick={onComplete}>
        Skip Intro →
      </button>
    </motion.div>
  );
}

export function PublicSiteLayout() {
  const location = useLocation();
  const reduce = useReducedMotion();
  const [showIntro, setShowIntro] = useState(true);

  const handleIntroComplete = () => {
    setShowIntro(false);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (location.hash) document.querySelector(location.hash)?.scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
      else window.scrollTo({ top: 0, behavior: "auto" });
    }, 20);
    return () => window.clearTimeout(timer);
  }, [location.hash, location.pathname, reduce]);

  return (
    <div className="public-site">
      <AnimatePresence>
        {showIntro && <IntroPreloader onComplete={handleIntroComplete} />}
      </AnimatePresence>
      <a className="site-skip" href="#site-main">Skip to content</a><Header />
      <AnimatePresence mode="wait">
        <motion.main id="site-main" key={location.pathname} initial={{ opacity: 0, y: reduce ? 0 : 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduce ? 0.1 : 0.5, ease: [0.22, 1, 0.36, 1] }}>
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <Footer />
    </div>
  );
}
export function FullWidthCta({ eyebrow, title, copy, action, to, imageFile }: { eyebrow: string; title: string; copy?: string; action: string; to: string; imageFile: string }) {
  return (
    <section className="site-cta site-shell">
      <div className="site-cta__overlay" />
      <Reveal className="site-cta__content">
        <span className="site-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        {copy && <p>{copy}</p>}
        <AnimatedButton to={to} variant="light">{action}</AnimatedButton>
      </Reveal>
    </section>
  );
}
