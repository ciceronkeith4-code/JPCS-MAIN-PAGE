export type SiteRoute = { label: string; to: string };
export type Feature = { eyebrow: string; title: string; description: string; details: string[]; imageLabel: string; imageFile: string };

export const navigation: SiteRoute[] = [
  { label: "Home", to: "/" },
  { label: "About Us", to: "/about" },
  { label: "Testimonial", to: "/testimonials" },
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
  { label: "For computing students", title: "Student member", note: "Sign in with your official account credentials to access the portal.", items: ["Chapter activities", "Programming workshops", "Technical seminars", "Community channels", "Member resources", "Competition opportunities"], action: "Sign In to Portal", to: "/login" },
  { label: "For organizations and professionals", title: "Industry & Government Partner", note: "Collaborate with us to drive innovation across public and private sectors.", items: ["IT industry linkages", "Government sector collaborations", "Joint development projects", "Talent & hiring pipelines", "Technical consultations", "Community outreach"], action: "Build a Partnership", to: "/about#contact" },
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
  { eyebrow: "Partners and alumni", title: "Strong alliances in IT industry and Government sectors.", description: "Forging valuable bridges with IT industry giants and government agencies to support digital transformation, career pipelines, and tech service programs.", items: ["IT Industry collaborations", "Government sector partnerships", "Student internships", "Project sponsorships", "Technical advisory", "Alumni engagement"], imageLabel: "Alumni and partner collaboration image", imageFile: "community-partners.webp" },
];

export const values: Feature[] = [
  { eyebrow: "Practice", title: "Developing capable professionals", description: "Students deserve opportunities to transform technical knowledge into practical ability.", details: ["Curiosity made useful", "Strong foundations", "Responsible technical practice"], imageLabel: "Students presenting a technical project image", imageFile: "about-capability.webp" },
  { eyebrow: "Responsibility", title: "Supporting student leaders", description: "Leadership should be learned through service, responsibility, and meaningful experience.", details: ["Listen before leading", "Own the outcome", "Make space for others"], imageLabel: "Student leader facilitating a meeting image", imageFile: "about-leadership.webp" },
  { eyebrow: "Belonging", title: "Creating inclusive communities", description: "Every computing student should feel welcome, supported, and encouraged to participate.", details: ["Welcoming entry points", "Peer support", "Shared success"], imageLabel: "Inclusive student community image", imageFile: "about-community.webp" },
  { eyebrow: "Connection", title: "Industry & Government Alliance", description: "Building strong partnerships in the IT industry and government sector to expand student horizons, opportunities, and public-sector tech initiatives.", details: ["IT industry mentorship", "Government sector integration", "Joint tech initiatives"], imageLabel: "Industry and government collaboration image", imageFile: "about-industry.webp" },
  { eyebrow: "Service", title: "Serving through technology", description: "Technology is most meaningful when it improves communities and creates opportunities.", details: ["Human-centered solutions", "Community partnership", "Ethical contribution"], imageLabel: "Technology community outreach image", imageFile: "about-service.webp" },
];

export const officers = [
  { name: "Keith Czimonne Anderson Ciceron", role: "President", course: "BSIT · 4th Year", responsibility: "Sets the department direction, leads student initiatives, and supports every team.", profile_photo: "/officers/ciceron_profile.png", action_photo: "/officers/ciceron_action.jpg" },
  { name: "Karl Tristan Benedicto", role: "Vice President", course: "BSIT · 4th Year", responsibility: "Coordinates academic programs and strengthens internal officer collaboration.", profile_photo: "/officers/benedicto_profile.png", action_photo: "/officers/benedicto_action.jpg" },
  { name: "Andrei Baguisa", role: "Secretary", course: "BSIT · 4th Year", responsibility: "Keeps department communications, schedules, and official records dependable.", profile_photo: "/officers/baguisa_profile.jpg", action_photo: "/officers/baguisa_action.jpg" },
  { name: "Kenneth Gregorio", role: "Treasurer", course: "BSIT · 4th Year", responsibility: "Stewards department funds, budget planning, and resources with clarity and care." },
  { name: "Khemuel Timkang", role: "Auditor", course: "BSIT · 4th Year", responsibility: "Maintains transparency and conducts audits for all department activities.", profile_photo: "/officers/timkang_profile.jpg", action_photo: "/officers/timkang_action.jpg" },
  { name: "Von Dimaculangan", role: "P.R.O.", course: "BSIT · 4th Year", responsibility: "Manages public relations, announcements, and external communications." },
  { name: "John Carl Arche", role: "Technical Head", course: "BSIT · 4th Year", responsibility: "Directs technical workshops, hands-on bootcamps, and developer support.", profile_photo: "/officers/arche_profile.png", action_photo: "/officers/arche_action.jpg" },
  { name: "Lance Alvarez Ceasar", role: "Content Manager", course: "BSIT · 4th Year", responsibility: "Curates, edits, and designs creative digital media content for the department." },
  { name: "JD Pagkatipunan", role: "Head of Sports", course: "BSIT · 4th Year", responsibility: "Organizes sports fests, computing e-sports, and physical fitness activities.", profile_photo: "/officers/pagkatipunan_profile.jpg", action_photo: "/officers/pagkatipunan_action.jpg" },
  { name: "Rick Paolo Suero", role: "4th Yr Representative", course: "BSIT · 4th Year", responsibility: "Represents the senior class, assisting fourth-year students with graduation requirements.", profile_photo: "/officers/suero_profile.jpg", action_photo: "/officers/suero_action.jpg" },
  { name: "Kenneth Fernandez", role: "3rd Yr Representative", course: "BSIT · 4th Year", responsibility: "Coordinates with third-year class sections for department events and workshops.", profile_photo: "/officers/fernandez_profile.jpg", action_photo: "/officers/fernandez_action.jpg" },
  { name: "Ruth Geras", role: "2nd Yr Representative", course: "BSIT · 4th Year", responsibility: "Coordinates with second-year class sections and supports peer learning circles.", profile_photo: "/officers/geras_profile.jpg", action_photo: "/officers/geras_action.jpg" },
  { name: "Jam Morales", role: "1st Yr Representative", course: "BSIT · 4th Year", responsibility: "Assists incoming freshmen in adjusting to the IT department community.", profile_photo: "/officers/morales_profile.png", action_photo: "/officers/morales_action.png" },
];

export const seo = {
  home: { title: "IT DEPARTMENT OF SSCR MANILA | Empowering Future Computing Professionals", description: "IT DEPARTMENT OF SSCR MANILA is a student-led community for technical learning, leadership, innovation, professional connection, and service.", path: "/" },
  programs: { title: "Programs | IT DEPARTMENT OF SSCR MANILA", description: "Explore programming workshops, seminars, competitions, research, leadership, and networking programs from the IT DEPARTMENT OF SSCR MANILA.", path: "/programs" },
  community: { title: "Community | IT DEPARTMENT OF SSCR MANILA", description: "Discover how the IT Department connects students, officers, educators, alumni, and technology partners through shared learning and service.", path: "/community" },
  about: { title: "About | IT DEPARTMENT OF SSCR MANILA", description: "Learn why the IT Department of SSCR Manila exists and how it develops capable, ethical, innovative, service-oriented computing professionals.", path: "/about" },
  testimonials: { title: "Testimonials | IT DEPARTMENT OF SSCR MANILA", description: "Read inspiring stories and experiences from the IT DEPARTMENT OF SSCR MANILA alumni and student leaders.", path: "/testimonials" },
};

export type Testimonial = {
  name: string;
  role: string;
  quote: string;
  imageFile: string;
};

export const alumniTestimonials: Testimonial[] = [
  {
    name: "Keith Ciceron",
    role: "Former IT Department | SSCR MANILA President (2023-2024)",
    quote: "Serving as President of the IT Department student community was one of the most defining moments of my student years. It wasn't just about leading events, but witnessing how a passionate community of computing students can come together, share knowledge, and lift each other up. The technical workshops and network we established paved the way for my transition into the tech industry.",
    imageFile: "/officers/keith_profile.png"
  },
  {
    name: "Mark Diaz",
    role: "Former IT Department | SSCR MANILA Vice President (2022-2023)",
    quote: "The IT Department provided the bridge between theoretical classroom education and practical real-world skills. Through organizing hackathons and coordinating with industry partners, I gained technical and project management capabilities that you simply cannot learn from textbooks alone. I'm proud to see the community continue this legacy.",
    imageFile: "/officers/mark_profile.png"
  },
  {
    name: "Patricia Santos",
    role: "Former IT Department | SSCR MANILA Secretary (2021-2022)",
    quote: "What I loved most about the IT Department community was the inclusive learning culture. We started peer mentorship groups where senior students guided freshmen through tough programming concepts. Being part of this leadership circle built my communication skills and confidence, which are crucial in my current role as a Software Engineer.",
    imageFile: "/images/about-leadership.webp"
  },
  {
    name: "John Christian Ramos",
    role: "Former IT Department | SSCR MANILA Tech Lead (2022-2024)",
    quote: "We spent countless nights preparing hands-on programming bootcamps and tech seminars. The IT Department gave me a sandbox to build projects, try new technologies, and teach others. The experience of designing curriculum for workshops set a strong foundation for my career in Cloud Architecture.",
    imageFile: "/images/about-capability.webp"
  }
];
