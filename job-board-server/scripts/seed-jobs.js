'use strict';

/**
 * scripts/seed-jobs.js
 * Seed 30 realistic fake job listings into the database, each with a generated
 * description_embedding so vector / semantic search works immediately.
 *
 * Usage:
 *   node scripts/seed-jobs.js
 *
 * Requires MONGODB_URI in .env (or environment).
 * Set NODE_ENV=production to use real API keys; leave unset for mock embeddings.
 * Safe to re-run -- jobs with the same title + employerId are skipped.
 */

require('dotenv').config();

const bcrypt   = require('bcryptjs');
const mongoose = require('mongoose');
const Job      = require('../models/Job');
const User     = require('../models/User');
const { generateEmbedding } = require('../services/embeddings');

// Must match BCRYPT_ROUNDS in auth.service.js
const BCRYPT_ROUNDS = 12;

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/jobboard';

// Demo employer
const DEMO_EMPLOYER = {
  name:          'Demo Employer',
  email:         'demo.employer@jobpulse.test',
  role:          'employer',
  emailVerified: true,
};

// 30 realistic job listings
const JOB_SEEDS = [
  // Frontend
  {
    title:           'Senior Frontend Engineer',
    role:            'Frontend Engineer',
    location:        'London',
    jobType:         'full-time',
    experienceLevel: 'Senior',
    salary:          'GBP 75k-95k',
    skills_required: ['React', 'TypeScript', 'CSS Modules', 'REST APIs', 'Webpack', 'Jest'],
    description:
      'We are looking for a Senior Frontend Engineer to lead the development of our customer-facing web platform, built with React 18 and TypeScript. ' +
      'You will own end-to-end feature delivery from scoping and technical design through implementation, code review, and production release. ' +
      'Our team moves fast: we ship to production multiple times a day and rely heavily on automated testing and feature flags. ' +
      'You will mentor two mid-level engineers and collaborate closely with Product and Design to raise the bar on UI quality and performance. ' +
      'Experience with Core Web Vitals optimisation and accessibility (WCAG 2.1 AA) is a strong plus.',
  },
  {
    title:           'Junior Frontend Developer',
    role:            'Frontend Engineer',
    location:        'Remote',
    jobType:         'remote',
    experienceLevel: 'Junior',
    salary:          'USD 55k-70k',
    skills_required: ['React', 'JavaScript', 'HTML5', 'CSS3', 'Git'],
    description:
      'Join our growing product team as a Junior Frontend Developer and build features used by thousands of small-business owners every day. ' +
      'You will work in a supportive environment with detailed code reviews, pair-programming sessions, and a dedicated learning budget. ' +
      'Day-to-day you will translate Figma designs into pixel-perfect React components, write unit tests, and participate in sprint planning. ' +
      'We welcome candidates who are self-taught or early in their career -- a strong portfolio or open-source contributions matter more than years of experience.',
  },
  {
    title:           'Frontend Engineer - Design Systems',
    role:            'Frontend Engineer',
    location:        'Berlin',
    jobType:         'full-time',
    experienceLevel: 'Mid',
    salary:          'EUR 65k-85k',
    skills_required: ['React', 'TypeScript', 'Storybook', 'CSS-in-JS', 'Figma', 'Accessibility'],
    description:
      'We are building a world-class design system that powers 12 internal product teams and need an experienced Frontend Engineer to join the core Design Systems squad. ' +
      'Your primary focus will be authoring, documenting, and maintaining a library of accessible, composable React components published as an npm package. ' +
      'You will work directly with designers in Figma and ensure every token, motion spec, and component variant is faithfully implemented in code. ' +
      'Strong knowledge of CSS architecture, theming strategies, and automated visual regression testing (Chromatic / Percy) is essential.',
  },

  // Backend
  {
    title:           'Backend Engineer - Payments',
    role:            'Backend Engineer',
    location:        'Singapore',
    jobType:         'full-time',
    experienceLevel: 'Senior',
    salary:          'SGD 130k-180k',
    skills_required: ['Node.js', 'PostgreSQL', 'Stripe API', 'Redis', 'Kafka', 'TypeScript'],
    description:
      'As a Backend Engineer on our Payments team you will design and build the systems that move real money from checkout through settlement, reconciliation, and fraud detection. ' +
      'You will work with Stripe, Adyen, and local payment gateways across South-East Asia, owning integrations end-to-end including webhook handling, retry logic, and idempotency guarantees. ' +
      'Our stack is Node.js (TypeScript) with PostgreSQL, Redis for idempotency keys, and Kafka for event streaming between services. ' +
      'You should be comfortable reasoning about distributed transactions, currency rounding edge cases, and PCI-DSS compliance requirements.',
  },
  {
    title:           'Backend Engineer - APIs',
    role:            'Backend Engineer',
    location:        'Bangalore',
    jobType:         'full-time',
    experienceLevel: 'Mid',
    salary:          'INR 22-32 LPA',
    skills_required: ['Python', 'FastAPI', 'PostgreSQL', 'Docker', 'REST APIs', 'pytest'],
    description:
      'We are hiring a Backend Engineer to build and maintain RESTful APIs that serve our mobile and web clients. ' +
      'You will work in Python with FastAPI, writing clean, well-tested services deployed on AWS using Docker and ECS. ' +
      'Key responsibilities include designing database schemas in PostgreSQL, writing migrations, authoring OpenAPI documentation, and conducting code reviews. ' +
      'You will collaborate with frontend engineers and participate in on-call rotation for the services you own.',
  },
  {
    title:           'Backend Engineer - Data Pipeline',
    role:            'Backend Engineer',
    location:        'Remote',
    jobType:         'remote',
    experienceLevel: 'Senior',
    salary:          null,
    skills_required: ['Go', 'Kafka', 'PostgreSQL', 'Kubernetes', 'gRPC', 'Prometheus'],
    description:
      'Our data platform team processes over 50 billion events per day and we need a Senior Backend Engineer comfortable operating at that scale. ' +
      'You will design and implement high-throughput data pipelines in Go, leveraging Kafka for message streaming and PostgreSQL for analytical queries. ' +
      'The role involves significant system-design work: capacity planning, schema evolution, back-pressure strategies, and SLA ownership. ' +
      'A background in distributed systems and experience with Kubernetes-based deployments are required; experience with ClickHouse or Flink is a bonus.',
  },

  // Full Stack
  {
    title:           'Full Stack Developer - SaaS Platform',
    role:            'Full Stack Developer',
    location:        'Mumbai',
    jobType:         'full-time',
    experienceLevel: 'Mid',
    salary:          'INR 18-26 LPA',
    skills_required: ['React', 'Node.js', 'MongoDB', 'GraphQL', 'TypeScript', 'AWS'],
    description:
      'We are looking for a Full Stack Developer to take end-to-end ownership of features on our B2B SaaS platform used by over 2000 businesses. ' +
      'On the frontend you will work with React and Apollo Client; on the backend you will write GraphQL resolvers in Node.js backed by MongoDB. ' +
      'You will be responsible for everything from database schema design to pixel-level UI polish, deployments, and monitoring. ' +
      'We operate a small, high-trust team where engineers ship with autonomy -- you will spend minimal time in meetings and maximum time building.',
  },
  {
    title:           'Full Stack Engineer - FinTech',
    role:            'Full Stack Developer',
    location:        'New York',
    jobType:         'full-time',
    experienceLevel: 'Senior',
    salary:          'USD 145k-185k',
    skills_required: ['Next.js', 'TypeScript', 'Python', 'PostgreSQL', 'Redis', 'AWS Lambda'],
    description:
      'Join our FinTech startup building the next generation of personal wealth management tools. ' +
      'As a Senior Full Stack Engineer you will own features from API design (Python/FastAPI) through to React/Next.js frontend, with a focus on performance and security. ' +
      'You will work closely with compliance to ensure data handling meets SOC 2 and GDPR requirements, writing thorough unit and integration tests as you go. ' +
      'Our culture prioritises craft and correctness: we would rather ship something great slowly than something buggy quickly.',
  },
  {
    title:           'Full Stack Developer - Internship',
    role:            'Full Stack Developer',
    location:        'Remote',
    jobType:         'internship',
    experienceLevel: 'Junior',
    salary:          'USD 25/hr',
    skills_required: ['React', 'Node.js', 'REST APIs', 'Git', 'SQL'],
    description:
      'This 12-week paid internship is designed for students or recent graduates who want real-world full-stack experience. ' +
      'You will be embedded in a product squad and contribute to live features -- not just internal tools or toy projects. ' +
      'We will pair you with a senior mentor who provides daily check-ins, code reviews, and career guidance throughout the programme. ' +
      'Strong interns are regularly converted to full-time roles at the end of the internship.',
  },

  // Data Science
  {
    title:           'Senior Data Scientist - Growth',
    role:            'Data Scientist',
    location:        'London',
    jobType:         'full-time',
    experienceLevel: 'Senior',
    salary:          'GBP 90k-115k',
    skills_required: ['Python', 'scikit-learn', 'SQL', 'A/B Testing', 'Pandas', 'Spark', 'Tableau'],
    description:
      'Our Growth team is looking for a Senior Data Scientist to design and analyse experiments that drive user acquisition and retention. ' +
      'You will work across the full experimentation lifecycle: hypothesis definition, power analysis, implementation, analysis, and stakeholder communication. ' +
      'Day-to-day you will write complex SQL against BigQuery, build predictive models in Python, and present findings to C-level stakeholders. ' +
      'You should be deeply comfortable with causal inference, Bayesian A/B testing, and the statistical pitfalls common in fast-moving product analytics.',
  },
  {
    title:           'Data Scientist - Recommendations',
    role:            'Data Scientist',
    location:        'Bangalore',
    jobType:         'full-time',
    experienceLevel: 'Mid',
    salary:          'INR 25-38 LPA',
    skills_required: ['Python', 'TensorFlow', 'SQL', 'Collaborative Filtering', 'Spark', 'MLflow'],
    description:
      'Join our AI/ML team to build recommendation systems that personalise the experience for millions of users. ' +
      'You will design, train, and evaluate collaborative and content-based filtering models, then work with engineers to ship them to production. ' +
      'Strong Python skills, experience with large-scale data processing using Spark, and familiarity with model serving infrastructure are required. ' +
      'You will also contribute to our ML platform -- logging experiments in MLflow, versioning datasets, and defining model performance SLAs.',
  },

  // DevOps / SRE
  {
    title:           'Senior DevOps Engineer',
    role:            'DevOps Engineer',
    location:        'Remote',
    jobType:         'remote',
    experienceLevel: 'Senior',
    salary:          'USD 130k-165k',
    skills_required: ['Kubernetes', 'Terraform', 'AWS', 'CI/CD', 'Prometheus', 'Helm', 'Python'],
    description:
      'We are hiring a Senior DevOps Engineer to own our cloud infrastructure across three AWS regions and ensure 99.9% platform availability. ' +
      'You will design and maintain Kubernetes clusters with Helm, write infrastructure-as-code in Terraform, and build automated CI/CD pipelines in GitHub Actions. ' +
      'Security hardening, cost optimisation, and incident response are core parts of the role alongside platform engineering. ' +
      'Experience with GitOps workflows (Flux or ArgoCD) and cloud cost management tools (Infracost, AWS Cost Explorer) is highly valued.',
  },
  {
    title:           'DevOps / Cloud Engineer',
    role:            'DevOps Engineer',
    location:        'Berlin',
    jobType:         'full-time',
    experienceLevel: 'Mid',
    salary:          'EUR 70k-90k',
    skills_required: ['AWS', 'Docker', 'Terraform', 'Jenkins', 'Linux', 'Bash', 'Ansible'],
    description:
      'We need a DevOps Engineer to accelerate our delivery pipeline and reduce operational toil for a team of 30 engineers. ' +
      'You will manage our AWS infrastructure using Terraform, containerise services with Docker, and improve our Jenkins CI/CD setup. ' +
      'On a typical week you might be automating a deployment process, responding to an alert, reviewing infrastructure pull requests, or running a game-day exercise. ' +
      'A Linux background and solid Bash scripting skills are essential; experience with configuration management tools like Ansible is a plus.',
  },
  {
    title:           'Site Reliability Engineer',
    role:            'DevOps Engineer',
    location:        'Singapore',
    jobType:         'full-time',
    experienceLevel: 'Lead',
    salary:          'SGD 160k-220k',
    skills_required: ['Kubernetes', 'Go', 'Prometheus', 'Grafana', 'PagerDuty', 'Chaos Engineering', 'SLO'],
    description:
      'As a Lead SRE you will define the reliability strategy for a platform serving 10 million daily active users across Asia-Pacific. ' +
      'You will set SLOs, build alerting and runbooks, lead incident command during major outages, and drive post-mortem culture across engineering. ' +
      'Hands-on skills in Go (for tooling), Kubernetes (for orchestration), and Prometheus/Grafana (for observability) are required. ' +
      'You will also mentor junior SREs and act as a reliability ambassador in architecture reviews and new-service launches.',
  },

  // Product Management
  {
    title:           'Senior Product Manager - Platform',
    role:            'Product Manager',
    location:        'New York',
    jobType:         'full-time',
    experienceLevel: 'Senior',
    salary:          'USD 155k-200k',
    skills_required: ['Roadmapping', 'Stakeholder Management', 'Data Analysis', 'SQL', 'Agile', 'OKRs'],
    description:
      'We are looking for a Senior Product Manager to own the developer-facing platform that enables 500 internal engineers to build and ship products faster. ' +
      'You will set the vision and roadmap for our internal platform, collect feedback from stakeholder engineering teams, and ruthlessly prioritise impact. ' +
      'Strong analytical skills and comfort writing SQL to validate decisions are expected; you will work with data dashboards daily. ' +
      'Previous experience as a software engineer or in a technical PM role is a significant advantage.',
  },
  {
    title:           'Product Manager - Consumer App',
    role:            'Product Manager',
    location:        'London',
    jobType:         'full-time',
    experienceLevel: 'Mid',
    salary:          'GBP 75k-95k',
    skills_required: ['User Research', 'A/B Testing', 'Roadmapping', 'Analytics', 'JIRA', 'Figma'],
    description:
      'Join our consumer product team as a Product Manager responsible for the core mobile app experience used by 3 million monthly active users. ' +
      'You will lead discovery -- user interviews, usability testing, market research -- and translate insights into a prioritised product backlog. ' +
      'Collaboration with Engineering and Design is constant; you will be in design reviews, sprint ceremonies, and launch readouts every week. ' +
      'Comfort with mobile app analytics platforms (Amplitude, Mixpanel) and statistical significance in A/B test results is required.',
  },

  // UI/UX Design
  {
    title:           'Senior UI/UX Designer',
    role:            'UI/UX Designer',
    location:        'Remote',
    jobType:         'remote',
    experienceLevel: 'Senior',
    salary:          'USD 110k-140k',
    skills_required: ['Figma', 'Prototyping', 'User Research', 'Design Systems', 'Usability Testing', 'Motion Design'],
    description:
      'We are hiring a Senior UI/UX Designer to own the visual and interaction design for our enterprise SaaS product. ' +
      'You will lead design from discovery through delivery -- running user research sessions, creating wireframes and high-fidelity Figma prototypes, and collaborating with engineers during implementation. ' +
      'Maintaining and evolving our design system is a significant part of the role; you will work closely with the Design Systems frontend engineer to keep tokens and components in sync. ' +
      'A strong portfolio demonstrating complex product design (not just marketing sites) and experience with motion design are required.',
  },
  {
    title:           'UI/UX Designer - Mobile',
    role:            'UI/UX Designer',
    location:        'Bangalore',
    jobType:         'full-time',
    experienceLevel: 'Mid',
    salary:          'INR 16-24 LPA',
    skills_required: ['Figma', 'iOS HIG', 'Material Design', 'Prototyping', 'User Research', 'Accessibility'],
    description:
      'We are looking for a UI/UX Designer passionate about mobile-first experiences to join our product design team. ' +
      'You will own the end-to-end design of new features on our iOS and Android applications -- from problem framing and sketching to polished Figma prototypes handed off to developers. ' +
      'Deep knowledge of iOS Human Interface Guidelines and Material Design 3 is expected; you should articulate why a design decision fits or breaks platform conventions. ' +
      'Experience conducting moderated usability tests and synthesising findings into actionable design changes is essential.',
  },

  // Mobile Development
  {
    title:           'iOS Engineer - Core App',
    role:            'Mobile Developer',
    location:        'London',
    jobType:         'full-time',
    experienceLevel: 'Senior',
    salary:          'GBP 85k-110k',
    skills_required: ['Swift', 'SwiftUI', 'UIKit', 'Core Data', 'Combine', 'XCTest', 'CI/CD'],
    description:
      'Our iOS team is looking for a Senior iOS Engineer to take technical leadership of the flagship app downloaded by 8 million users. ' +
      'You will design and implement new features in SwiftUI, migrate legacy UIKit screens, and set architectural standards adopted by the wider iOS team. ' +
      'Ownership of the CI/CD pipeline (Fastlane + Bitrise), crash monitoring, and release process sits with this role. ' +
      'Experience with performance profiling using Instruments, and a track record of shipping large-scale iOS apps, are required.',
  },
  {
    title:           'Android Developer',
    role:            'Mobile Developer',
    location:        'Remote',
    jobType:         'remote',
    experienceLevel: 'Mid',
    salary:          'USD 95k-125k',
    skills_required: ['Kotlin', 'Jetpack Compose', 'MVVM', 'Coroutines', 'Retrofit', 'Room', 'Espresso'],
    description:
      'We are building a next-generation Android app in Kotlin with Jetpack Compose and need a talented mid-level Android Developer to join the team. ' +
      'You will implement UI components using Compose, write ViewModels and UseCases following clean-architecture conventions, and integrate REST APIs via Retrofit. ' +
      'Testing is a first-class citizen: we expect unit tests for every ViewModel and Espresso UI tests for critical flows. ' +
      'Experience with offline-first architecture (Room + WorkManager) and deep-link handling is a significant advantage.',
  },
  {
    title:           'React Native Developer',
    role:            'Mobile Developer',
    location:        'Mumbai',
    jobType:         'full-time',
    experienceLevel: 'Mid',
    salary:          'INR 20-30 LPA',
    skills_required: ['React Native', 'TypeScript', 'Redux Toolkit', 'Expo', 'REST APIs', 'Jest'],
    description:
      'Join our cross-platform mobile team and ship to both iOS and Android from a single React Native codebase. ' +
      'You will build and maintain features using React Native with Expo, manage application state with Redux Toolkit, and integrate backend APIs written in Node.js. ' +
      'We care deeply about performance -- you should know how to diagnose janky animations, optimise bridge calls, and use the Hermes profiler. ' +
      'Familiarity with Expo OTA update mechanisms and app store submission processes is required.',
  },

  // QA Engineering
  {
    title:           'QA Engineer - Automation',
    role:            'QA Engineer',
    location:        'Bangalore',
    jobType:         'full-time',
    experienceLevel: 'Mid',
    salary:          'INR 14-20 LPA',
    skills_required: ['Playwright', 'TypeScript', 'API Testing', 'CI/CD', 'JIRA', 'Postman'],
    description:
      'We are looking for a QA Engineer passionate about automation to help us achieve 90 percent test coverage across our web platform. ' +
      'You will design and implement end-to-end test suites using Playwright and TypeScript, integrate them into our GitHub Actions CI pipeline, and maintain a shared test utilities library. ' +
      'On the API side you will write contract tests using Postman collections and validate integration points between microservices. ' +
      'A proactive mindset -- filing detailed bug reports, improving CI flakiness, and pushing for shift-left quality practices -- is as important as technical skill.',
  },
  {
    title:           'Lead QA Engineer',
    role:            'QA Engineer',
    location:        'Remote',
    jobType:         'remote',
    experienceLevel: 'Lead',
    salary:          'USD 115k-145k',
    skills_required: ['Test Strategy', 'Selenium', 'Python', 'Performance Testing', 'k6', 'Mentoring', 'CI/CD'],
    description:
      'As Lead QA Engineer you will define and own the quality strategy for a suite of five microservices in our fintech platform. ' +
      'You will build and lead a team of three QA Engineers, establishing testing standards, reviewing test plans, and ensuring regulatory requirements around test evidence are met. ' +
      'Technical responsibilities include designing performance test scenarios in k6, maintaining our Selenium grid, and integrating quality gates into the CI/CD pipeline. ' +
      'Experience in a regulated industry (finance, healthcare, or similar) and a track record of building QA capability from scratch are strongly preferred.',
  },

  // Machine Learning Engineering
  {
    title:           'Machine Learning Engineer - NLP',
    role:            'Machine Learning Engineer',
    location:        'London',
    jobType:         'full-time',
    experienceLevel: 'Senior',
    salary:          'GBP 95k-130k',
    skills_required: ['Python', 'PyTorch', 'Transformers', 'ONNX', 'FastAPI', 'AWS SageMaker', 'MLflow'],
    description:
      'Our AI Research team needs a Senior ML Engineer to productionise large language models and NLP pipelines powering our intelligent document processing product. ' +
      'You will fine-tune transformer models (BERT, LLaMA variants) on proprietary datasets, optimise inference latency using ONNX and quantisation, and deploy models via FastAPI on AWS SageMaker. ' +
      'Strong software engineering practices are required: your code will be reviewed, tested, and operated by the broader engineering team, not just data scientists. ' +
      'Experience with MLOps -- experiment tracking in MLflow, model versioning, A/B testing model variants -- is essential.',
  },
  {
    title:           'ML Engineer - Computer Vision',
    role:            'Machine Learning Engineer',
    location:        'Singapore',
    jobType:         'full-time',
    experienceLevel: 'Mid',
    salary:          'SGD 100k-140k',
    skills_required: ['Python', 'PyTorch', 'OpenCV', 'YOLO', 'TensorRT', 'Docker', 'GCP'],
    description:
      'Join our computer vision team building real-time object detection and scene understanding systems for autonomous robotics applications. ' +
      'You will train and evaluate detection models (YOLO, DETR) on custom datasets, implement data augmentation pipelines, and optimise models for edge deployment using TensorRT. ' +
      'Close collaboration with hardware engineers to meet strict latency and power constraints is a daily reality of this role. ' +
      'Experience with dataset labelling workflows (Label Studio, Roboflow) and model performance analysis (mAP, confusion matrices) is required.',
  },
  {
    title:           'Machine Learning Engineer - Internship',
    role:            'Machine Learning Engineer',
    location:        'Remote',
    jobType:         'internship',
    experienceLevel: 'Junior',
    salary:          'USD 30/hr',
    skills_required: ['Python', 'scikit-learn', 'PyTorch', 'Jupyter', 'SQL', 'Git'],
    description:
      'This paid ML internship (16 weeks) is ideal for graduate students or recent graduates with a background in machine learning or statistics. ' +
      'You will work alongside senior ML engineers on live projects -- not toy datasets -- contributing to data preprocessing, model prototyping, and evaluation pipelines. ' +
      'Weekly reading groups, mentoring sessions, and access to GPU compute are included throughout the programme. ' +
      'We are particularly interested in candidates with strong mathematical fundamentals who can explain model behaviour, not just run code.',
  },

  // Additional variety
  {
    title:           'Lead Backend Engineer - Microservices',
    role:            'Backend Engineer',
    location:        'New York',
    jobType:         'full-time',
    experienceLevel: 'Lead',
    salary:          'USD 190k-240k',
    skills_required: ['Java', 'Spring Boot', 'Kafka', 'PostgreSQL', 'Kubernetes', 'gRPC', 'OpenTelemetry'],
    description:
      'We are hiring a Lead Backend Engineer to architect and guide the evolution of our core microservices platform processing 1 million transactions per hour. ' +
      'You will set technical direction for a team of six engineers, drive architectural decisions, and lead cross-team initiatives around service-mesh adoption and observability. ' +
      'Deep expertise in Java/Spring Boot, event-driven design with Kafka, and distributed tracing with OpenTelemetry is essential. ' +
      'This role is as much about influence and communication as it is about coding -- you will present proposals to the CTO and mentor engineers across three teams.',
  },
  {
    title:           'Part-Time Frontend Developer',
    role:            'Frontend Engineer',
    location:        'Remote',
    jobType:         'part-time',
    experienceLevel: 'Mid',
    salary:          'USD 45/hr',
    skills_required: ['Vue.js', 'TypeScript', 'Tailwind CSS', 'REST APIs', 'Vite'],
    description:
      'We need a skilled Frontend Developer for a 20-hour-per-week engagement (flexible hours, fully remote) to help maintain and extend our Vue 3 web application. ' +
      'The ideal candidate is self-directed, communicates asynchronously well, and can deliver features with minimal hand-holding. ' +
      'You will participate in weekly video syncs, use Linear for task management, and hand off completed features via pull requests with thorough descriptions. ' +
      'This is a great opportunity for a developer seeking flexible work while maintaining a high level of technical engagement.',
  },
  {
    title:           'Senior Full Stack Engineer - Open Source',
    role:            'Full Stack Developer',
    location:        'Remote',
    jobType:         'remote',
    experienceLevel: 'Senior',
    salary:          null,
    skills_required: ['TypeScript', 'Next.js', 'Prisma', 'PostgreSQL', 'tRPC', 'Docker', 'GitHub Actions'],
    description:
      'We build open-source developer tooling used by 40000 developers worldwide and are growing our core engineering team. ' +
      'As a Senior Full Stack Engineer you will work in public -- most of your code is open-source -- meaning high visibility and real community impact. ' +
      'Our stack is Next.js 14 with tRPC and Prisma, deployed to Railway with PostgreSQL. ' +
      'Experience contributing to or maintaining open-source projects, and comfort with transparent async-first communication, are important cultural fits for this role.',
  },
  {
    title:           'QA Engineer - Part-Time',
    role:            'QA Engineer',
    location:        'Bangalore',
    jobType:         'part-time',
    experienceLevel: 'Junior',
    salary:          'INR 8-12 LPA (pro-rated)',
    skills_required: ['Manual Testing', 'Selenium', 'JIRA', 'Bug Reporting', 'Agile'],
    description:
      'We are looking for a Junior QA Engineer on a part-time basis (3 days per week) to support our mobile and web quality efforts. ' +
      'Responsibilities include exploratory testing of new features before release, writing detailed bug reports, and maintaining test-case repositories in Confluence. ' +
      'You will also assist in building basic Selenium scripts to automate repetitive regression checks. ' +
      'This position is well-suited for someone returning to work, studying part-time, or looking for a flexible entry-level QA role.',
  },
];

// Main

async function seedJobs() {
  console.log('🔗 Connecting to MongoDB…');
  await mongoose.connect(MONGODB_URI);
  console.log('✅ Connected.\n');

  // 1. Find or create the demo employer
  let employer = await User.findOne({ role: 'employer' });

  if (employer) {
    console.log(`👤 Using existing employer: "${employer.name}" (${employer.email})`);
  } else {
    console.log('👤 No employer found — creating demo employer…');
    const passwordHash = await bcrypt.hash('Password123!', BCRYPT_ROUNDS);
    employer = await User.create({
      ...DEMO_EMPLOYER,
      passwordHash,
    });
    console.log(`✅ Created employer: "${employer.name}" (${employer.email})`);
  }

  console.log(`\n📄 Processing ${JOB_SEEDS.length} job seed(s)…\n`);

  let inserted = 0;
  let skipped  = 0;
  let failed   = 0;

  for (let i = 0; i < JOB_SEEDS.length; i++) {
    const seed = JOB_SEEDS[i];
    const label = `[${i + 1}/${JOB_SEEDS.length}] "${seed.title}"`;

    try {
      // 2. Duplicate check
      const existing = await Job.findOne({
        title:      seed.title,
        employerId: employer._id,
      });

      if (existing) {
        console.log(`  ⏭  Job ${label} already exists, skipping`);
        skipped++;
        continue;
      }

      // 3. Generate embedding
      const description_embedding = await generateEmbedding(seed.description);

      // 4. Insert
      await Job.create({
        ...seed,
        status:     'open',
        employerId: employer._id,
        description_embedding,
      });

      console.log(
        `  ✔ Job ${label} → ${description_embedding.length} dims`
      );
      inserted++;
    } catch (err) {
      console.error(`  ✘ Job ${label}: ${err.message}`);
      failed++;
    }
  }

  console.log(`\n🎉 Done. Inserted: ${inserted}, Skipped: ${skipped}, Failed: ${failed}`);

  await mongoose.disconnect();
  process.exit(failed > 0 ? 1 : 0);
}

seedJobs().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
