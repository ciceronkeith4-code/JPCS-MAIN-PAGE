import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  MapPin,
  Quote,
  X,
} from "lucide-react";
import {
  achievements,
  events,
  galleryMoments,
  officers,
  testimonials,
  type LandingEvent,
} from "../data/content";
import { useTimelineProgress } from "../hooks/useLandingMotion";
import { LandingIcon, Reveal, SectionHeading } from "./shared";

export function OfficersSection() {
  return (
    <section id="officers" className="landing-section landing-officers">
      <div className="landing-shell">
        <Reveal>
          <SectionHeading
            eyebrow="Meet the team"
            title="Students leading students forward."
            description="The chapter is guided by officers committed to clear service, dependable programs, and an open community."
            align="center"
          />
        </Reveal>
        <div className="landing-officers__grid">
          {officers.map((officer, index) => (
            <Reveal className="landing-officer-card" key={officer.name} delay={index * 0.05}>
              <div className="landing-officer-card__portrait" aria-hidden="true">
                <span>{officer.initials}</span>
                <div className="landing-officer-card__pattern" />
              </div>
              <div className="landing-officer-card__body">
                <small>{officer.position}</small>
                <h3>{officer.name}</h3>
                <p>{officer.course} · {officer.year}</p>
                <div className="landing-officer-card__detail">
                  <p>{officer.responsibility}</p>
                  <span><Check /> {officer.social}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function EventCard({ event }: { event: LandingEvent }) {
  return (
    <article className={`landing-event-card${event.featured ? " landing-event-card--featured" : ""}`}>
      <div className="landing-event-card__date"><strong>{event.date}</strong><span>{event.month}</span></div>
      <div className="landing-event-card__body">
        <div className="landing-event-card__meta"><span>{event.category}</span><i>{event.status}</i></div>
        <h3>{event.title}</h3>
        <p>{event.description}</p>
        <div className="landing-event-card__location"><MapPin /> {event.location}</div>
      </div>
      <ChevronRight className="landing-event-card__arrow" aria-hidden="true" />
    </article>
  );
}

export function EventsSection() {
  const [active, setActive] = useState<"upcoming" | "past">("upcoming");
  const visibleEvents = events.filter((event) => event.type === active);

  return (
    <section id="events" className="landing-section landing-events">
      <div className="landing-shell">
        <div className="landing-events__header">
          <Reveal>
            <SectionHeading
              eyebrow="Chapter calendar"
              title="Show up curious. Leave more capable."
              description="Workshops, forums, competitions, and community gatherings that turn interest into momentum."
            />
          </Reveal>
          <div className="landing-segmented" role="tablist" aria-label="Event filters">
            {(["upcoming", "past"] as const).map((type) => (
              <button
                key={type}
                role="tab"
                aria-selected={active === type}
                className={active === type ? "is-active" : ""}
                onClick={() => setActive(type)}
              >
                {type === "upcoming" ? "Upcoming events" : "Past events"}
              </button>
            ))}
          </div>
        </div>
        <div className="landing-events__list" role="tabpanel" key={active}>
          {visibleEvents.map((event) => <EventCard key={event.id} event={event} />)}
        </div>
      </div>
    </section>
  );
}

export function AchievementsSection() {
  const timelineRef = useRef<HTMLElement>(null);
  useTimelineProgress(timelineRef);

  return (
    <section id="achievements" ref={timelineRef} className="landing-section landing-achievements">
      <div className="landing-shell">
        <Reveal>
          <SectionHeading
            eyebrow="Milestones"
            title="Progress worth building on."
            description="A growing record of student work, recognition, and service."
            align="center"
          />
        </Reveal>
        <div className="landing-timeline">
          <div className="landing-timeline__track"><span data-timeline-progress /></div>
          {achievements.map((achievement, index) => (
            <Reveal className={`landing-timeline__item${index % 2 ? " is-right" : ""}`} key={`${achievement.year}-${achievement.title}`}>
              <div className="landing-timeline__marker"><LandingIcon name={achievement.icon} /></div>
              <article>
                <div><strong>{achievement.year}</strong><span>{achievement.category}</span></div>
                <h3>{achievement.title}</h3>
                <p>{achievement.description}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function GalleryMotif({ motif }: { motif: string }) {
  return (
    <div className={`landing-gallery-motif landing-gallery-motif--${motif}`} aria-hidden="true">
      <span className="motif-ring" /><span className="motif-grid" />
      <LandingIcon name={
        motif === "code" ? "Code2"
          : motif === "nodes" ? "Network"
            : motif === "trophy" ? "Trophy"
              : motif === "people" ? "Users"
                : motif === "heart" ? "HeartHandshake"
                  : "Compass"
      } />
    </div>
  );
}

export function GallerySection() {
  const [selected, setSelected] = useState<number | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selected === null) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
      if (event.key === "ArrowRight") setSelected((current) => current === null ? 0 : (current + 1) % galleryMoments.length);
      if (event.key === "ArrowLeft") setSelected((current) => current === null ? 0 : (current - 1 + galleryMoments.length) % galleryMoments.length);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [selected]);

  const move = (direction: number) => {
    setSelected((current) => current === null ? 0 : (current + direction + galleryMoments.length) % galleryMoments.length);
  };

  return (
    <section id="gallery" className="landing-section landing-gallery">
      <div className="landing-shell">
        <Reveal>
          <SectionHeading
            eyebrow="Inside the chapter"
            title="Moments that make a community."
            description="An image-free visual journal of the spaces where members learn, create, compete, and serve together."
          />
        </Reveal>
        <div className="landing-gallery__grid">
          {galleryMoments.map((moment, index) => (
            <Reveal className={`landing-gallery-card item-${index + 1}`} key={moment.title} delay={(index % 3) * 0.04}>
              <button onClick={() => setSelected(index)} aria-label={`Open ${moment.title} details`}>
                <GalleryMotif motif={moment.motif} />
                <span className="landing-gallery-card__caption"><small>{moment.category}</small><strong>{moment.title}</strong></span>
                <span className="landing-gallery-card__open"><ArrowRight /></span>
              </button>
            </Reveal>
          ))}
        </div>
      </div>

      {selected !== null && (
        <div className="landing-lightbox" role="dialog" aria-modal="true" aria-labelledby="gallery-dialog-title" onMouseDown={(event) => {
          if (event.currentTarget === event.target) setSelected(null);
        }}>
          <div className="landing-lightbox__panel">
            <button ref={closeButton} className="landing-lightbox__close" onClick={() => setSelected(null)} aria-label="Close gallery"><X /></button>
            <GalleryMotif motif={galleryMoments[selected].motif} />
            <div className="landing-lightbox__copy">
              <small>{galleryMoments[selected].category}</small>
              <h3 id="gallery-dialog-title">{galleryMoments[selected].title}</h3>
              <p>{galleryMoments[selected].description}</p>
              <span>{selected + 1} / {galleryMoments.length}</span>
            </div>
            <div className="landing-lightbox__navigation">
              <button onClick={() => move(-1)} aria-label="Previous gallery item"><ArrowLeft /></button>
              <button onClick={() => move(1)} aria-label="Next gallery item"><ArrowRight /></button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export function TestimonialsSection() {
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((current) => (current + 1) % testimonials.length), 6500);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <section className="landing-section landing-testimonials">
      <div className="landing-shell landing-testimonials__grid">
        <Reveal>
          <SectionHeading eyebrow="Member stories" title="What growth feels like from the inside." />
          <p className="landing-testimonials__intro">Different paths, one community committed to helping students move forward with confidence.</p>
          <div className="landing-carousel-controls">
            <button onClick={() => setActive((active - 1 + testimonials.length) % testimonials.length)} aria-label="Previous testimonial"><ArrowLeft /></button>
            <button onClick={() => setActive((active + 1) % testimonials.length)} aria-label="Next testimonial"><ArrowRight /></button>
          </div>
        </Reveal>
        <div className="landing-testimonial" key={active} aria-live="polite">
          <Quote />
          <blockquote>“{testimonials[active].quote}”</blockquote>
          <div className="landing-testimonial__person">
            <span>{testimonials[active].initials}</span>
            <p><strong>{testimonials[active].name}</strong><small>{testimonials[active].detail} · {testimonials[active].role}</small></p>
          </div>
          <div className="landing-carousel-dots" aria-label="Choose testimonial">
            {testimonials.map((testimonial, index) => (
              <button key={testimonial.name} className={index === active ? "is-active" : ""} onClick={() => setActive(index)} aria-label={`Show testimonial ${index + 1}`} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
