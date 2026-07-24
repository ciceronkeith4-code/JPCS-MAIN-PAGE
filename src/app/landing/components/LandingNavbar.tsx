import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Menu, X } from "lucide-react";
import { navigationItems } from "../data/content";
import { scrollToLandingSection } from "./shared";

export function LandingNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState("home");
  const firstMobileLink = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 18);
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    const sections = navigationItems
      .map((item) => document.querySelector<HTMLElement>(item.href))
      .filter(Boolean) as HTMLElement[];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-22% 0px -62% 0px", threshold: [0, 0.15, 0.35] },
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    firstMobileLink.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  const navigate = (href: string) => {
    scrollToLandingSection(href);
    setMenuOpen(false);
  };

  return (
    <header className={`landing-nav${scrolled ? " landing-nav--scrolled" : ""}`}>
      <div className="landing-shell landing-nav__inner">
        <button className="landing-brand" onClick={() => navigate("#home")} aria-label="Junior Philippine Computer Society home">
          <span className="landing-brand__mark" aria-hidden="true">
            <img src="/jpcs-logo.png" alt="" />
          </span>
          <span>
            <strong className="logo-text-full">Junior Philippine Computer Society</strong>
            <strong className="logo-text-short">JPCS</strong>
            <small>SSCR Manila Chapter</small>
          </span>
        </button>

        <nav className="landing-nav__links" aria-label="Main navigation">
          {navigationItems.slice(1, 6).map((item, index) => (
            <button
              key={item.href}
              className={activeSection === item.href.slice(1) ? "is-active" : ""}
              onClick={() => navigate(item.href)}
            >
              <small>{String(index + 1).padStart(2, "0")}</small>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="landing-nav__actions">
          <Link className="landing-login-link" to="/login"><small>06</small> Member login</Link>
          <Link className="landing-button landing-button--small" to="/register">
            Join JPCS <ArrowUpRight size={15} />
          </Link>
        </div>

        <button
          className="landing-menu-toggle"
          onClick={() => setMenuOpen((open) => !open)}
          aria-expanded={menuOpen}
          aria-controls="landing-mobile-menu"
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>

      <div id="landing-mobile-menu" className={`landing-mobile-menu${menuOpen ? " is-open" : ""}`}>
        <nav aria-label="Mobile navigation">
          {navigationItems.map((item, index) => (
            <button
              ref={index === 0 ? firstMobileLink : undefined}
              key={item.href}
              className={activeSection === item.href.slice(1) ? "is-active" : ""}
              onClick={() => navigate(item.href)}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>{item.label}
            </button>
          ))}
          <div className="landing-mobile-menu__actions">
            <Link to="/login" onClick={() => setMenuOpen(false)}>Member login</Link>
            <Link className="landing-button" to="/register" onClick={() => setMenuOpen(false)}>
              Join JPCS <ArrowUpRight size={17} />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}
