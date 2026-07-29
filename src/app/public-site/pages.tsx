import { ArrowDown, Check, Download, ExternalLink, Quote } from "lucide-react";
import { AnimatedButton, benefitIcons, FeatureRow, FullWidthCta, ImagePlaceholder, Reveal, SectionHeading, Seo, OfficerPhoto } from "./components";
import { audienceBenefits, benefits, communityAudiences, homePrograms, memberships, officers, programFeatures, seo, values, alumniTestimonials } from "./data";

function PageHero({ eyebrow, title, copy, primary, primaryTo, secondary, secondaryTo, imageLabel, imageFile, home = false }: { eyebrow: string; title: string; copy: string; primary: string; primaryTo: string; secondary?: string; secondaryTo?: string; imageLabel: string; imageFile: string; home?: boolean }) {
  return (
    <section className={`site-page-hero${home ? " site-page-hero--home" : ""}`}>
      <div className="site-shell">
        <Reveal className="site-page-hero__copy"><span className="site-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{copy}</p><div className="site-page-hero__actions"><AnimatedButton to={primaryTo}>{primary}</AnimatedButton>{secondary && secondaryTo && <AnimatedButton to={secondaryTo} variant="outline">{secondary}</AnimatedButton>}</div></Reveal>
        <Reveal className="site-page-hero__visual" delay={0.12}><ImagePlaceholder priority label={imageLabel} file={imageFile} /></Reveal>
        <a className="site-page-hero__scroll" href="#page-intro"><ArrowDown aria-hidden="true" /></a>
      </div>
    </section>
  );
}

export function HomePage() {
  return (
    <>
      <Seo {...seo.home} />
      <PageHero home eyebrow="IT Department · SSCR Manila" title="Empowering Future Computing Professionals" copy="The IT Department of SSCR Manila is a student-led technology community that develops technical skills, leadership, innovation, and meaningful professional connections." primary="Join IT Department" primaryTo="/register" secondary="Explore our community" secondaryTo="/community" imageLabel="IT Department members collaborating" imageFile="home-hero.jpg" />

      <section className="site-section site-narrative" id="page-intro">
        <div className="site-shell site-narrative__grid">
          <Reveal><span className="site-eyebrow">Beyond the syllabus</span><h2>A computing education should extend beyond the classroom.</h2></Reveal>
          <Reveal className="site-narrative__body" delay={0.08}><p>Students often have limited practical exposure, small professional networks, and too few opportunities to build confidence through leadership. Technical concepts become more meaningful when they are tested with people, projects, and real responsibility.</p><p className="site-narrative__statement">The IT Department connects learning, leadership, innovation, and community in one student-led organization.</p></Reveal>
        </div>
      </section>

      <section className="site-section site-feature-section site-home-features">
        <div className="site-shell"><SectionHeading eyebrow="What we make possible" title="Experiences that move from learning to doing." copy="A carefully balanced program of technical practice, professional exposure, collaboration, and service." />{homePrograms.map((feature, index) => <FeatureRow key={feature.title} feature={feature} index={index} />)}</div>
      </section>

      <section className="site-section site-benefits">
        <div className="site-shell"><SectionHeading eyebrow="Growth at every stage" title="The IT Department helps students grow with opportunities designed for every stage of their journey." />
          <div className="site-benefits__grid">{benefits.map((benefit, index) => { const Icon = benefitIcons[benefit.icon as keyof typeof benefitIcons]; return <Reveal className="site-benefit" delay={index * 0.05} key={benefit.title}><span><Icon aria-hidden="true" /></span><h3>{benefit.title}</h3><p>{benefit.copy}</p></Reveal>; })}</div>
        </div>
      </section>

      <section className="site-section site-story">
        <div className="site-shell site-story__grid"><Reveal><ImagePlaceholder label="Department adviser or president portrait" file="home-adviser-portrait.webp" /></Reveal><Reveal className="site-story__quote" delay={0.08}><Quote aria-hidden="true" /><blockquote>“The IT Department should be the place where students discover that they are capable of more—because they have people beside them, meaningful work in front of them, and room to lead.”</blockquote><p><strong>Keith Czimonne Anderson Ciceron</strong><span>Current BSIT President</span></p><AnimatedButton to="/about" variant="text">Meet the department</AnimatedButton></Reveal></div>
      </section>

      <section className="site-section site-membership">
        <div className="site-shell"><SectionHeading eyebrow="A place for every contributor" title="Choose how you would like to take part." copy="No fee or official commitment is implied. Final membership and partnership details will be added after chapter confirmation." />
          <div className="site-membership__grid">{memberships.map((option, index) => <Reveal className={`site-membership-card${index ? " is-dark" : ""}`} delay={index * 0.08} key={option.title}><span className="site-eyebrow">{option.label}</span><h3>{option.title}</h3><p>{option.note}</p><ul>{option.items.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul><AnimatedButton to={option.to} variant={index ? "light" : "primary"}>{option.action}</AnimatedButton></Reveal>)}</div>
        </div>
      </section>

      <FullWidthCta eyebrow="Your next chapter" title="Build your skills. Find your community. Shape the future with the IT Department." action="Join IT Department today" to="/register" imageFile="home-final-cta.webp" />
    </>
  );
}

export function ProgramsPage() {
  return (
    <>
      <Seo {...seo.programs} />
      <PageHero eyebrow="IT Department programs" title="Move beyond theory and start building real technical capability." copy="IT Department programs give computing students opportunities to learn, lead, collaborate, compete, and create." primary="View upcoming activities" primaryTo="/community#resources" imageLabel="IT Department workshop or coding event" imageFile="programs-hero.webp" />
      <section className="site-section site-intro" id="page-intro"><div className="site-shell site-intro__grid"><SectionHeading eyebrow="Practice with purpose" title="Practical experiences designed around the needs of computing students." /><Reveal><p>Classroom foundations matter. The IT Department adds the situations that make them usable: working with a team, explaining a decision, responding to feedback, and carrying an idea through to a thoughtful result.</p><AnimatedButton to="/community" variant="text">See who takes part</AnimatedButton></Reveal></div></section>
      <section className="site-section site-feature-section site-feature-section--compact"><div className="site-shell">{programFeatures.map((feature, index) => <FeatureRow key={feature.title} feature={feature} index={index} />)}</div></section>
      <section className="site-section site-audiences"><div className="site-shell"><SectionHeading eyebrow="Shared value" title="Programs that strengthen students, partners, and the college community." />
        <div className="site-audiences__grid">{audienceBenefits.map((audience, index) => <Reveal className="site-audience-card" delay={index * 0.06} key={audience.title}><span>0{index + 1}</span><h3>{audience.title}</h3><ul>{audience.items.map((item) => <li key={item}><Check aria-hidden="true" />{item}</li>)}</ul></Reveal>)}</div>
      </div></section>
      <FullWidthCta eyebrow="Make the next move" title="Turn your curiosity into capability." action="Join an upcoming program" to="/community#resources" imageFile="programs-final-cta.webp" />
    </>
  );
}

export function CommunityPage() {
  return (
    <>
      <Seo {...seo.community} />
      <PageHero eyebrow="The IT Department community" title="A stronger computing community, built around every student." copy="The IT Department brings students, officers, educators, alumni, and industry partners together through shared learning and meaningful experiences." primary="Become part of the IT Department" primaryTo="/register" imageLabel="IT Department community" imageFile="community-hero.webp" />
      <section className="site-section site-community-overview" id="page-intro"><div className="site-shell"><SectionHeading eyebrow="Many perspectives, one chapter" title="One organization. Different opportunities for every member of the community." />
        <div className="site-community-overview__grid"><Reveal><span>01</span><h3>Students</h3><p>Learn with peers, build experience, and find the confidence to contribute.</p></Reveal><Reveal delay={0.06}><span>02</span><h3>Officers</h3><p>Turn service and responsibility into leadership that lasts beyond one event.</p></Reveal><Reveal delay={0.12}><span>03</span><h3>Partners and alumni</h3><p>Share insight, create access, and stay connected to the next generation.</p></Reveal></div>
      </div></section>
      <section className="site-section site-community-groups"><div className="site-shell">{communityAudiences.map((audience, index) => <article className={`site-community-group${index % 2 ? " is-reversed" : ""}`} key={audience.title}><Reveal className="site-community-group__visual"><ImagePlaceholder label={audience.imageLabel} file={audience.imageFile} /></Reveal><Reveal className="site-community-group__copy" delay={0.08}><span className="site-eyebrow">{audience.eyebrow}</span><h2>{audience.title}</h2><p>{audience.description}</p><div className="site-community-group__list">{audience.items.map((item) => <span key={item}><Check aria-hidden="true" />{item}</span>)}</div></Reveal></article>)}</div></section>
      <section className="site-section site-learning" id="resources"><div className="site-shell site-learning__grid"><Reveal><span className="site-eyebrow">Shared learning</span><h2>Speak the same language of innovation, leadership, and service.</h2><p>The IT Department creates a connected technology community by giving students, educators, alumni, and partners a shared place to exchange knowledge and build things that matter.</p><a className="site-resource-link" href="/JPCS-membership-guide-placeholder.md" download><Download aria-hidden="true" /><span>View IT Department resources<small>Placeholder guide · replace when official details are available</small></span><ExternalLink aria-hidden="true" /></a></Reveal><Reveal delay={0.1}><ImagePlaceholder label="Shared learning and resources image" file="community-resources.webp" /></Reveal></div></section>
      <FullWidthCta eyebrow="Participation creates community" title="Great technology communities are built through participation." action="Become part of the IT Department" to="/register" imageFile="community-final-cta.webp" />
    </>
  );
}

export function AboutPage() {
  const reasons = ["Students need more real-world technical experience.", "Classroom knowledge needs practical application.", "Emerging professionals need leadership opportunities.", "Students benefit from stronger professional networks.", "Technology communities grow through collaboration."];
  return (
    <>
      <Seo {...seo.about} />
      <PageHero eyebrow="About the department" title="A student community built to help future computing professionals thrive." copy="The IT Department of SSCR Manila creates opportunities for students to strengthen technical skills, develop leadership, build meaningful connections, and serve the wider community." primary="Join the department" primaryTo="/register" imageLabel="Atmospheric IT Department collage" imageFile="about-hero.webp" />
      <section className="site-section site-why" id="page-intro"><div className="site-shell"><SectionHeading eyebrow="The need we answer" title="Why the IT Department exists" />
        <div className="site-why__list">{reasons.map((reason, index) => <Reveal key={reason} className="site-why__item" delay={index * 0.03}><span>0{index + 1}</span><p>{reason}</p></Reveal>)}</div>
      </div></section>
      <section className="site-statement"><div className="site-shell"><Reveal><span className="site-eyebrow">Our role</span><h2>Students need a community that connects technical learning, leadership, professional development, and service. <em>That is the role of the IT Department.</em></h2></Reveal></div></section>
      <section className="site-section site-feature-section site-values-section"><div className="site-shell"><SectionHeading eyebrow="Our values in practice" title="What we care about" />{values.map((value, index) => <FeatureRow key={value.title} feature={value} index={index} />)}</div></section>
      <section className="site-section site-purpose-pair"><div className="site-shell site-purpose-pair__grid"><Reveal><span className="site-eyebrow">Mission</span><h2>Develop capable, ethical, innovative, and service-oriented computing professionals.</h2><p>We do this through student-led programs, purposeful practice, and meaningful collaboration.</p></Reveal><Reveal delay={0.08}><span className="site-eyebrow">Vision</span><h2>Become a leading student technology community.</h2><p>A chapter that empowers members to contribute confidently to the computing profession and society.</p></Reveal></div></section>
      <section className="site-section site-team"><div className="site-shell"><SectionHeading eyebrow="Leadership preview" title="A chapter shaped by students, with guidance that keeps it grounded." copy="All names, courses, year levels, profile links, and final portraits below are clearly marked portraits or placeholders awaiting official chapter information." />
        <div className="site-team__grid">{officers.map((officer, index) => <Reveal className="site-person" delay={(index % 3) * 0.04} key={officer.role}><OfficerPhoto name={officer.name} role={officer.role} profilePhoto={(officer as any).profile_photo} actionPhoto={(officer as any).action_photo} index={index} /><span className="site-eyebrow">{officer.role}</span><h3>{officer.name}</h3><small>{officer.course}</small><p>{officer.responsibility}</p><button type="button" disabled aria-label={`${officer.role} social link to be confirmed`}><ExternalLink aria-hidden="true" />Social link to be confirmed</button></Reveal>)}</div>
      </div></section>
      <FullWidthCta eyebrow="Grow with people beside you" title="You do not have to build your future alone." copy="Learn, lead, collaborate, and grow with the IT Department of SSCR Manila." action="Join the department" to="/register" imageFile="about-final-cta.webp" />
    </>
  );
}

export function TestimonialsPage() {
  return (
    <>
      <Seo {...seo.testimonials} />
      <PageHero
        eyebrow="Alumni Stories"
        title="Voices of the Department Legacy"
        copy="Hear directly from the alumni students and student leaders who shaped the IT Department of SSCR Manila. Learn how their experiences in the department helped them launch successful careers in the tech industry."
        primary="Join the Department Today"
        primaryTo="/register"
        imageLabel="Alumni networking and mentoring"
        imageFile="community-partners.webp"
      />

      <section className="site-section site-testimonials" id="page-intro">
        <div className="site-shell">
          <SectionHeading
            eyebrow="Our Legacy"
            title="Real Stories, Real Impact"
            copy="IT Department alumni share how leadership, technical bootcamps, and a strong professional community gave them the tools to thrive after graduation."
          />
          <div className="site-testimonials__grid">
            {alumniTestimonials.map((testimonial, index) => (
              <Reveal key={testimonial.name} className="site-testimonial-card" delay={index * 0.08}>
                <div className="site-testimonial-card__top">
                  <div className="site-testimonial-card__quote-icon">
                    <Quote aria-hidden="true" />
                  </div>
                  <blockquote className="site-testimonial-card__quote">
                    “{testimonial.quote}”
                  </blockquote>
                </div>
                <div className="site-testimonial-card__author">
                  <div className="site-testimonial-card__avatar">
                    <img 
                      src={testimonial.imageFile} 
                      alt={testimonial.name} 
                      onError={(e) => {
                        e.currentTarget.src = "/jpcs-logo.png";
                      }} 
                    />
                  </div>
                  <div className="site-testimonial-card__meta">
                    <h3 className="site-testimonial-card__name">{testimonial.name}</h3>
                    <p className="site-testimonial-card__role">{testimonial.role}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <FullWidthCta
        eyebrow="Build Your Own Legacy"
        title="Be part of a community that grows together."
        copy="Connect with alumni, learn practical computing skills, and start building your own success story with the IT Department of SSCR Manila."
        action="Become a member"
        to="/register"
        imageFile="about-final-cta.webp"
      />
    </>
  );
}

