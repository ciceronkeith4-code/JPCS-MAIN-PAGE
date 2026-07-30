import { useEffect } from "react";
import { LandingNavbar } from "./components/LandingNavbar";
import { HeroSection } from "./components/HeroSection";
import { AboutSection, ProgramsSection, PurposeSection, StatsSection } from "./components/CoreSections";
import {
  AchievementsSection,
  EventsSection,
  GallerySection,
  OfficersSection,
  TestimonialsSection,
} from "./components/CommunitySections";
import { ContactSection, FAQSection, LandingFooter } from "./components/ConnectSections";
import "./landing.css";
import "./editorial.css";

export default function LandingPage() {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "JPCS–SSCR Manila | Empowering Future Computing Professionals";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <div className="landing-page">
      <a className="landing-skip-link" href="#landing-main">Skip to main content</a>
      <LandingNavbar />
      <main id="landing-main">
        <HeroSection />
        <AboutSection />
        <PurposeSection />
        <StatsSection />
        <ProgramsSection />
        <OfficersSection />
        <EventsSection />
        <AchievementsSection />
        <GallerySection />
        <TestimonialsSection />
        <FAQSection />
        <ContactSection />
      </main>
      <LandingFooter />
    </div>
  );
}
