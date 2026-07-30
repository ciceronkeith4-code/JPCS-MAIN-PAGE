// Replace sample names, dates, and contact details with approved chapter content.
export const navigationItems = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Mission & Vision", href: "#mission" },
  { label: "Programs", href: "#programs" },
  { label: "Officers", href: "#officers" },
  { label: "Events", href: "#events" },
  { label: "Achievements", href: "#achievements" },
  { label: "Gallery", href: "#gallery" },
  { label: "FAQs", href: "#faqs" },
  { label: "Contact", href: "#contact" },
] as const;

export const statistics = [
  { value: 500, suffix: "+", label: "Active members" },
  { value: 30, suffix: "+", label: "Learning events" },
  { value: 15, suffix: "+", label: "Awards earned" },
  { value: 100, suffix: "+", label: "Projects built" },
] as const;

export const coreValues = [
  { icon: "Lightbulb", title: "Innovation", description: "We turn curiosity into practical solutions that improve campus and community life." },
  { icon: "Compass", title: "Leadership", description: "We give students the confidence to lead teams, initiatives, and meaningful change." },
  { icon: "ShieldCheck", title: "Integrity", description: "We practice responsible computing grounded in ethics, respect, and accountability." },
  { icon: "Users", title: "Collaboration", description: "We grow by sharing knowledge and building across disciplines and year levels." },
  { icon: "Sparkles", title: "Excellence", description: "We pursue thoughtful work, continuous learning, and professional standards." },
  { icon: "HeartHandshake", title: "Service", description: "We use technology to serve people and strengthen the communities around us." },
] as const;

export const programs = [
  { icon: "Crown", title: "Leadership", label: "Lead with purpose", description: "Officer development, project ownership, and peer mentoring for future technology leaders.", size: "wide" },
  { icon: "Code2", title: "Programming", label: "Build real skills", description: "Hands-on sessions covering software, web, data, and emerging platforms.", size: "standard" },
  { icon: "Network", title: "Networking", label: "Connect beyond campus", description: "Conversations with alumni, professionals, partner chapters, and industry mentors.", size: "standard" },
  { icon: "FlaskConical", title: "Research", label: "Explore what is next", description: "Student-led inquiry that turns new ideas into clear, testable, useful outcomes.", size: "tall" },
  { icon: "Trophy", title: "Hackathons", label: "Compete and create", description: "Fast-paced team challenges that sharpen creative problem-solving under pressure.", size: "standard" },
  { icon: "Presentation", title: "Seminars", label: "Learn from practitioners", description: "Focused talks and workshops led by faculty, alumni, and technology professionals.", size: "standard" },
  { icon: "HandHeart", title: "Community", label: "Technology in service", description: "Digital literacy, outreach, and collaborative initiatives with a human impact.", size: "wide" },
] as const;

export const officers = [
  { initials: "KR", name: "Keith Ramos", position: "Chapter President", course: "BSIT", year: "4th Year", responsibility: "Leads chapter strategy, partnerships, and the officer council.", social: "President's office" },
  { initials: "MA", name: "Mark Alvarez", position: "Vice President", course: "BSIT", year: "4th Year", responsibility: "Coordinates programs and supports cross-team delivery.", social: "Programs committee" },
  { initials: "AS", name: "Angela Santos", position: "Secretary", course: "BSIT", year: "3rd Year", responsibility: "Maintains chapter records and communication standards.", social: "Secretariat" },
  { initials: "JM", name: "Joshua Mendoza", position: "Technical Lead", course: "BSIT", year: "3rd Year", responsibility: "Guides workshops, project teams, and technical mentorship.", social: "Technical committee" },
] as const;

export type LandingEvent = {
  id: string;
  type: "upcoming" | "past";
  date: string;
  month: string;
  title: string;
  location: string;
  category: string;
  description: string;
  status: "Open" | "Upcoming" | "Completed";
  featured?: boolean;
};

export const events: LandingEvent[] = [
  { id: "code-forward", type: "upcoming", date: "18", month: "SEP", title: "Code Forward: Web Engineering Lab", location: "Computer Laboratory 2", category: "Workshop", description: "A guided build session on accessible interfaces, APIs, and dependable deployment workflows.", status: "Open", featured: true },
  { id: "career-circuits", type: "upcoming", date: "04", month: "OCT", title: "Career Circuits", location: "St. Augustine Hall", category: "Industry Forum", description: "Alumni and technology leaders unpack early-career paths and professional growth.", status: "Upcoming" },
  { id: "research-sprint", type: "upcoming", date: "22", month: "OCT", title: "Student Research Sprint", location: "Innovation Room", category: "Research", description: "Turn a relevant computing problem into a concise, evidence-based research proposal.", status: "Upcoming" },
  { id: "hackfest", type: "past", date: "15", month: "FEB", title: "Recoletos HackFest", location: "Main Auditorium", category: "Competition", description: "Inter-year teams designed practical digital tools for campus communities.", status: "Completed", featured: true },
  { id: "assembly", type: "past", date: "10", month: "JAN", title: "JPCS General Assembly", location: "St. Monica Hall", category: "Community", description: "Members aligned on the semester roadmap, committees, and opportunities to contribute.", status: "Completed" },
  { id: "git-clinic", type: "past", date: "06", month: "DEC", title: "Git Collaboration Clinic", location: "Computer Laboratory 1", category: "Workshop", description: "A practical clinic on branches, reviews, and healthy team development workflows.", status: "Completed" },
];

export const achievements = [
  { year: "2026", icon: "Award", category: "Academic recognition", title: "Outstanding Student Organization Finalist", description: "Recognized for consistent programming, member development, and community contribution." },
  { year: "2025", icon: "Medal", category: "Competition", title: "Regional Innovation Challenge — Top 3", description: "A student team placed for an accessible campus-services prototype." },
  { year: "2025", icon: "Rocket", category: "Projects", title: "100th Member Project Milestone", description: "The chapter portfolio reached one hundred documented student-led builds." },
  { year: "2024", icon: "Handshake", category: "Community", title: "Digital Skills Outreach Launched", description: "Members began a recurring digital literacy program with local partner communities." },
] as const;

export const galleryMoments = [
  { title: "Build Night", category: "Programming", motif: "code", description: "Students pairing on a semester project during an evening build session." },
  { title: "Research Exchange", category: "Research", motif: "nodes", description: "A collaborative review of student research directions and methods." },
  { title: "HackFest Finals", category: "Competition", motif: "trophy", description: "Finalists presenting practical prototypes to faculty and industry judges." },
  { title: "General Assembly", category: "Community", motif: "people", description: "Members gathering to shape the chapter roadmap and volunteer teams." },
  { title: "Tech for Service", category: "Outreach", motif: "heart", description: "A digital skills session designed for community learners." },
  { title: "Officer Workshop", category: "Leadership", motif: "compass", description: "Chapter officers planning programs through a focused leadership workshop." },
] as const;

export const testimonials = [
  { quote: "JPCS gave me a place to practice what we learn in class and the confidence to present our work to real audiences.", name: "Camille Navarro", detail: "BSIT, 3rd Year", role: "Project Team Member", initials: "CN" },
  { quote: "The workshops are practical, but the community is what made the biggest difference. Someone is always willing to help you move forward.", name: "Paolo Reyes", detail: "BSIT, 2nd Year", role: "Workshop Volunteer", initials: "PR" },
  { quote: "Leading a committee taught me how to communicate clearly, manage tradeoffs, and build with people—not only with technology.", name: "Mika Torres", detail: "BSIT, 4th Year", role: "Former Committee Lead", initials: "MT" },
] as const;

export const faqs = [
  { question: "What is JPCS?", answer: "The Junior Philippine Computer Society is a student organization that develops computing students through technical learning, leadership, professional exposure, research, and service." },
  { question: "Who can join JPCS–SSCR Manila?", answer: "Membership is intended for currently enrolled SSCR Manila students who are interested in computing, technology, innovation, and collaborative learning." },
  { question: "Are first-year students allowed to join?", answer: "Yes. First-year students are encouraged to join early, meet peers across year levels, and participate in beginner-friendly programs." },
  { question: "What activities does the organization conduct?", answer: "The chapter organizes workshops, seminars, competitions, research activities, general assemblies, peer mentoring, outreach, and collaborative projects." },
  { question: "How can students register?", answer: "Select Join JPCS, create an account using your official institutional email, and follow the verification instructions sent to your inbox." },
  { question: "Are there membership fees?", answer: "Membership arrangements may vary by academic year. Official details are announced during registration and the general assembly." },
  { question: "Can members participate in competitions?", answer: "Yes. Members can join chapter-supported teams based on event requirements, readiness, and available slots." },
  { question: "How can students become officers?", answer: "Officer opportunities are announced through official chapter channels and typically consider active participation, service, leadership readiness, and eligibility requirements." },
] as const;

export const contactDetails = {
  email: "jpcssscrmnl@gmail.com",
  facebook: "JPCS- SSCR Manila Chapter",
  location: "San Sebastian College–Recoletos Manila",
  phone: "",
  hours: "Monday–Friday, 9:00 AM–4:00 PM",
} as const;