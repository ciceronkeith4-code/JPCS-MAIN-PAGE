import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  Award,
  Code2,
  Compass,
  Crown,
  FlaskConical,
  HandHeart,
  Handshake,
  HeartHandshake,
  Lightbulb,
  Medal,
  Network,
  Presentation,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
  type LucideProps,
} from "lucide-react";

type RevealProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
};

export function Reveal({ children, className, delay = 0 }: RevealProps) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      className={className}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 22 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.16 }}
      transition={{ duration: reduceMotion ? 0.18 : 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "left" | "center";
}) {
  return (
    <div className={`landing-heading landing-heading--${align}`}>
      <span className="landing-eyebrow">{eyebrow}</span>
      <h2>{title}</h2>
      {description && <p>{description}</p>}
    </div>
  );
}

const iconMap: Record<string, LucideIcon> = {
  Award,
  Code2,
  Compass,
  Crown,
  FlaskConical,
  HandHeart,
  Handshake,
  HeartHandshake,
  Lightbulb,
  Medal,
  Network,
  Presentation,
  Rocket,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
};

export function LandingIcon({ name, ...props }: { name: string } & LucideProps) {
  const Icon = iconMap[name] ?? Sparkles;
  return <Icon aria-hidden="true" {...props} />;
}

export function scrollToLandingSection(href: string) {
  const target = document.querySelector(href);
  if (!target) return;
  target.scrollIntoView({
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
    block: "start",
  });
}