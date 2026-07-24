export type SiteRoute = { label: string; to: string };
export type Feature = { eyebrow: string; title: string; description: string; details: string[]; imageLabel: string; imageFile: string };

export const navigation: SiteRoute[] = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  { label: "Contacts", to: "/about#contact" },
];

export const footerGroups = [
  { title: "Organization", links: [{ label: "Home", to: "/" }, { label: "Programs", to: "/programs" }, { label: "Community", to: "/community" }, { label: "About", to: "/about" }] },
  { title: "Resources", links: [{ label: "Events", to: "/community#resources" }, { label: "Gallery", to: "/community#resources" }, { label: "FAQs", to: "/community#resources" }, { label: "Membership guide", to: "/community#resources" }] },
];

export const homePrograms: Feature[] = [
  { eyebrow: "01 · Build", title: "Programming workshops", description: "Hands-on sessions turn classroom concepts into working skills through guided practice, peer collaboration, and project-based learning.", details: ["Web and software development", "Databases and cloud fundamentals", "Cybersecurity and emerging technology"], imageLabel: "Programming workshop image", imageFile: "home-programming-workshop.webp" },
  { eyebrow: "02 · Discover", title: "Seminars and research", description: "Students meet educators, alumni, and practitioners who make complex ideas relevant, practical, and connected to the profession.", details: ["Technical seminars", "Research presentation support", "Industry and alumni conversations"], imageLabel: "Technical seminar image", imageFile: "home-technical-seminar.webp" },
  { eyebrow: "03 · Create", title: "Hackathons and competitions", description: "Focused challenges help members think critically, work across disciplines, and create solutions under real constraints.", details: ["Team-based problem solving", "Project and pitch development", "Inter-school competition preparation"], imageLabel: "Hackathon team image", imageFile: "home-hackathon.webp" },
  { eyebrow: "04 · Lead", title: "Leadership and service", description: "Members learn to organize, communicate, and serve by leading initiatives that strengthen both the chapter and its wider community.", details: ["Student leadership development", "Community technology outreach", "Professional networking"], imageLabel: "Student leadership image", imageFile: "home-leadership.webp" },
];

export const benefits = [
  { icon: "code", title: "Strengthen technical capability", copy: "Practice beyond requirements and learn how ideas become dependable, useful work." },
  { icon: "lead", title: "Develop confident student leaders", copy: "Build judgment, communication, and ownership through meaningful responsibility." },
  { icon: "connect", title: "Build professional connections", copy: "Meet peers, alumni, educators, and practitioners who expand what feels possible." },
  { icon: "impact", title: "Create meaningful community impact", copy: "Use technology, time, and shared knowledge in service of people around you." },
];

export const memberships = [
  { label: "For computing students", title: "Student member", note: "Membership details available upon registration.", items: ["Chapter activities", "Programming workshops", "Technical seminars", "Community channels", "Member resources", "Competition opportunities"], action: "Become a member", to: "/register" },
  { label: "For organizations and professionals", title: "Partner or sponsor", note: "Contact us to shape a partnership around shared goals.", items: ["Event partnerships", "Community visibility", "Talent connections", "Technical mentorship", "Recruitment opportunities", "Institutional support"], action: "Partner with JPCS", to: "/about#contact" },
];

export const programFeatures: Feature[] = [
  { eyebrow: "Technical foundation", title: "Programming workshops", description: "Guided, hands-on sessions make room for questions, experimentation, and the repetition needed to build confidence.", details: ["Web and software engineering", "Database design and management", "Cybersecurity and networking", "Emerging technology explorations"], imageLabel: "Hands-on coding workshop image", imageFile: "programs-workshop.webp" },
  { eyebrow: "Professional perspective", title: "Technical seminars", description: "Conversations with educators, alumni, and practitioners connect academic foundations with current professional practice.", details: ["Industry-led discussions", "Alumni career stories", "Technical deep dives", "Ethics and professional responsibility"], imageLabel: "Technical seminar speaker image", imageFile: "programs-seminar.webp" },
  { eyebrow: "Collaborative challenge", title: "Hackathons and competitions", description: "Time-bound challenges sharpen teamwork, resourcefulness, presentation skills, and the ability to turn ambiguity into action.", details: ["Mentored team formation", "Rapid prototyping", "Pitch and presentation coaching", "Competition readiness"], imageLabel: "Hackathon collaboration image", imageFile: "programs-hackathon.webp" },
  { eyebrow: "Inquiry and invention", title: "Research and innovation", description: "Members receive a supportive environment for testing ideas, developing student projects, and communicating technical work clearly.", details: ["Research peer review", "Prototype feedback", "Technical presentation practice", "Interdisciplinary collaboration"], imageLabel: "Student research image", imageFile: "programs-research.webp" },
  { eyebrow: "Responsibility in practice", title: "Leadership development", description: "Chapter work becomes a practical leadership laboratory where students learn to plan, decide, listen, and follow through.", details: ["Event and project management", "Team coordination", "Clear communication", "Service-centered leadership"], imageLabel: "Student officers planning image", imageFile: "programs-leadership.webp" },
  { eyebrow: "Connections that matter", title: "Professional networking", description: "Thoughtful encounters with alumni, partners, and employers help students see career paths and build relationships with purpose.", details: ["Alumni conversations", "Partner-led sessions", "Career preparation", "Mentorship opportunities"], imageLabel: "Professional networking image", imageFile: "programs-networking.webp" },
];

export const audienceBenefits = [
  { title: "For students", items: ["Practical experience", "Technical confidence", "Portfolio development", "Leadership opportunities", "Professional connections"] },
  { title: "For partners", items: ["Student engagement", "Community visibility", "Talent connections", "Event collaboration", "Knowledge sharing"] },
  { title: "For the college", items: ["Stronger involvement", "External recognition", "Competitive participation", "Technology leadership", "Community impact"] },
];

export const communityAudiences = [
  { eyebrow: "Students", title: "Learn, collaborate, and build with confidence.", description: "A welcoming place to practice, ask better questions, find collaborators, and prepare for the opportunities ahead.", items: ["Technical workshops", "Student project support", "Competitions", "Study and peer communities", "Career preparation", "Learning resources"], imageLabel: "Students collaborating image", imageFile: "community-students.webp" },
  { eyebrow: "Officers", title: "Lead programs that create meaningful student experiences.", description: "Chapter leadership gives students a real setting for serving others while developing judgment, systems thinking, and accountability.", items: ["Event planning", "Team coordination", "Project management", "Communication", "Partnership development", "Leadership mentoring"], imageLabel: "Officers planning an event image", imageFile: "community-officers.webp" },
  { eyebrow: "Partners and alumni", title: "Share knowledge and help shape future technology professionals.", description: "Professionals and graduates bring context, encouragement, and opportunity into a student community eager to learn.", items: ["Guest speaking", "Mentorship", "Event sponsorship", "Internship opportunities", "Industry collaboration", "Alumni engagement"], imageLabel: "Alumni mentoring students image", imageFile: "community-partners.webp" },
];

export const values: Feature[] = [
  { eyebrow: "Practice", title: "Developing capable professionals", description: "Students deserve opportunities to transform technical knowledge into practical ability.", details: ["Curiosity made useful", "Strong foundations", "Responsible technical practice"], imageLabel: "Students presenting a technical project image", imageFile: "about-capability.webp" },
  { eyebrow: "Responsibility", title: "Supporting student leaders", description: "Leadership should be learned through service, responsibility, and meaningful experience.", details: ["Listen before leading", "Own the outcome", "Make space for others"], imageLabel: "Student leader facilitating a meeting image", imageFile: "about-leadership.webp" },
  { eyebrow: "Belonging", title: "Creating inclusive communities", description: "Every computing student should feel welcome, supported, and encouraged to participate.", details: ["Welcoming entry points", "Peer support", "Shared success"], imageLabel: "Inclusive student community image", imageFile: "about-community.webp" },
  { eyebrow: "Connection", title: "Connecting education and industry", description: "Professional relationships help students understand how their abilities apply beyond the classroom.", details: ["Career context", "Honest mentorship", "Mutual learning"], imageLabel: "Industry guest speaking with students image", imageFile: "about-industry.webp" },
  { eyebrow: "Service", title: "Serving through technology", description: "Technology is most meaningful when it improves communities and creates opportunities.", details: ["Human-centered solutions", "Community partnership", "Ethical contribution"], imageLabel: "Technology community outreach image", imageFile: "about-service.webp" },
];

export const officers = [
  { name: "Name to be confirmed", role: "President", course: "Course · Year to be confirmed", responsibility: "Sets the chapter direction and supports every team." },
  { name: "Name to be confirmed", role: "Vice President", course: "Course · Year to be confirmed", responsibility: "Coordinates programs and strengthens officer collaboration." },
  { name: "Name to be confirmed", role: "Secretary", course: "Course · Year to be confirmed", responsibility: "Keeps chapter communication and records dependable." },
  { name: "Name to be confirmed", role: "Treasurer", course: "Course · Year to be confirmed", responsibility: "Stewards chapter resources with clarity and care." },
  { name: "Names to be confirmed", role: "Committee Heads", course: "Courses · Years to be confirmed", responsibility: "Lead technical, creative, membership, and outreach work." },
  { name: "Name to be confirmed", role: "Faculty Adviser", course: "Official details to be confirmed", responsibility: "Guides the chapter with institutional and professional insight." },
];

export const seo = {
  home: { title: "JPCS–SSCR Manila | Empowering Future Computing Professionals", description: "JPCS–SSCR Manila is a student-led community for technical learning, leadership, innovation, professional connection, and service.", path: "/" },
  programs: { title: "Programs | JPCS–SSCR Manila", description: "Explore programming workshops, seminars, competitions, research, leadership, and networking programs from JPCS–SSCR Manila.", path: "/programs" },
  community: { title: "Community | JPCS–SSCR Manila", description: "Discover how JPCS connects students, officers, educators, alumni, and technology partners through shared learning and service.", path: "/community" },
  about: { title: "About | JPCS–SSCR Manila", description: "Learn why JPCS–SSCR Manila exists and how the chapter develops capable, ethical, innovative, service-oriented computing professionals.", path: "/about" },
};
