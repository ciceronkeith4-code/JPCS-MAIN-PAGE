import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Facebook,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
import { contactDetails, faqs, navigationItems } from "../data/content";
import { Reveal, SectionHeading, scrollToLandingSection } from "./shared";

export function FAQSection() {
  const [open, setOpen] = useState(0);

  return (
    <section id="faqs" className="landing-section landing-faq">
      <div className="landing-shell landing-faq__grid">
        <Reveal>
          <SectionHeading
            eyebrow="Good to know"
            title="Questions before you join?"
            description="Start here. If your question is not covered, the chapter team is only a message away."
          />
          <button className="landing-text-link" onClick={() => scrollToLandingSection("#contact")}>
            Ask the chapter team <ArrowRight />
          </button>
        </Reveal>
        <div className="landing-accordion">
          {faqs.map((faq, index) => {
            const isOpen = open === index;
            return (
              <div className={`landing-accordion__item${isOpen ? " is-open" : ""}`} key={faq.question}>
                <h3>
                  <button
                    aria-expanded={isOpen}
                    aria-controls={`faq-panel-${index}`}
                    onClick={() => setOpen(isOpen ? -1 : index)}
                  >
                    <span>{faq.question}</span><ChevronDown />
                  </button>
                </h3>
                <div id={`faq-panel-${index}`} className="landing-accordion__panel" hidden={!isOpen}>
                  <p>{faq.answer}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

type ContactErrors = Partial<Record<"name" | "email" | "subject" | "message", string>>;

export function ContactSection() {
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const values = {
      name: String(form.get("name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      subject: String(form.get("subject") || "").trim(),
      message: String(form.get("message") || "").trim(),
    };
    const nextErrors: ContactErrors = {};
    if (values.name.length < 2) nextErrors.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) nextErrors.email = "Enter a valid email address.";
    if (values.subject.length < 3) nextErrors.subject = "Add a short subject.";
    if (values.message.length < 10) nextErrors.message = "Tell us a little more (at least 10 characters).";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;

    setStatus("loading");
    window.setTimeout(() => {
      setStatus("success");
      const body = encodeURIComponent(`${values.message}\n\nFrom: ${values.name} (${values.email})`);
      window.location.href = `mailto:${contactDetails.email}?subject=${encodeURIComponent(values.subject)}&body=${body}`;
    }, 450);
  };

  return (
    <section id="contact" className="landing-section landing-contact">
      <div className="landing-shell">
        <Reveal>
          <SectionHeading
            eyebrow="Start a conversation"
            title="Let’s build the next chapter together."
            description="Reach out about membership, partnerships, chapter activities, or ways to contribute."
            align="center"
          />
        </Reveal>
        <div className="landing-contact__grid">
          <Reveal className="landing-contact__details">
            <div className="landing-contact__intro">
              <span>JPCS · SSCR MANILA</span>
              <h3>Open to ideas.<br />Ready to collaborate.</h3>
              <p>Our student officers respond during regular campus hours.</p>
            </div>
            <ul>
              <li><Mail /><span><small>Email</small><a href={`mailto:${contactDetails.email}`}>{contactDetails.email}</a></span></li>
              <li><Facebook /><span><small>Facebook</small><strong>{contactDetails.facebook}</strong></span></li>
              <li><MapPin /><span><small>Location</small><strong>{contactDetails.location}</strong></span></li>
              <li><Clock3 /><span><small>Office hours</small><strong>{contactDetails.hours}</strong></span></li>
            </ul>
          </Reveal>
          <Reveal className="landing-contact__form-wrap" delay={0.08}>
            <form className="landing-contact-form" onSubmit={submit} noValidate>
              <div className="landing-form-row">
                <label>
                  <span>Name</span>
                  <input name="name" autoComplete="name" aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "contact-name-error" : undefined} placeholder="Your full name" />
                  {errors.name && <small id="contact-name-error">{errors.name}</small>}
                </label>
                <label>
                  <span>Email</span>
                  <input name="email" type="email" autoComplete="email" aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "contact-email-error" : undefined} placeholder="you@example.com" />
                  {errors.email && <small id="contact-email-error">{errors.email}</small>}
                </label>
              </div>
              <label>
                <span>Subject</span>
                <input name="subject" aria-invalid={Boolean(errors.subject)} aria-describedby={errors.subject ? "contact-subject-error" : undefined} placeholder="How can we help?" />
                {errors.subject && <small id="contact-subject-error">{errors.subject}</small>}
              </label>
              <label>
                <span>Message</span>
                <textarea name="message" rows={5} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "contact-message-error" : undefined} placeholder="Share the details of your inquiry." />
                {errors.message && <small id="contact-message-error">{errors.message}</small>}
              </label>
              <button className="landing-button landing-button--large" type="submit" disabled={status === "loading"}>
                {status === "loading" ? <><LoaderCircle className="landing-spin" /> Preparing email…</> : <><Send /> Send message</>}
              </button>
              <p className="landing-form-note" aria-live="polite">
                {status === "success"
                  ? <><CheckCircle2 /> Your email application should now open with the message ready to send.</>
                  : "Submitting opens your default email application. No form data is stored on this site."}
              </p>
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="landing-footer">
      <div className="landing-shell">
        <div className="landing-footer__top">
          <div className="landing-footer__brand">
            <button onClick={() => scrollToLandingSection("#home")} className="landing-brand">
              <span className="landing-brand__mark" aria-hidden="true" style={{ display: "flex", gap: "8px" }}>
                <img src="/sscr-logo.png" alt="SSCR Logo" style={{ width: "42px", height: "42px", objectFit: "contain" }} />
                <img src="/jpcs-logo.png" alt="JPCS Logo" style={{ width: "42px", height: "42px", objectFit: "contain" }} />
              </span>
              <span>
                <strong className="logo-text-full">IT DEPARTMENT OF SSCR MANILA</strong>
                <strong className="logo-text-short">JPCS</strong>
                <small>JPCS | SSCR MANILA CHAPTER</small>
              </span>
            </button>
            <p>Developing responsible, capable, and connected computing professionals.</p>
          </div>
          <div className="landing-footer__links">
            <div><h3>Explore</h3>{navigationItems.slice(1, 6).map((item) => <button key={item.href} onClick={() => scrollToLandingSection(item.href)}>{item.label}</button>)}</div>
            <div><h3>Connect</h3>{navigationItems.slice(6).map((item) => <button key={item.href} onClick={() => scrollToLandingSection(item.href)}>{item.label}</button>)}</div>
            <div><h3>Portal</h3><Link to="/login">Sign In</Link></div>
          </div>
        </div>
        <div className="landing-footer__bottom">
          <p>© {new Date().getFullYear()} JPCS–SSCR Manila Chapter. All rights reserved.</p>
          <p>San Sebastian College–Recoletos Manila</p>
          <button onClick={() => scrollToLandingSection("#home")} aria-label="Back to top"><ArrowUp /></button>
        </div>
      </div>
    </footer>
  );
}
