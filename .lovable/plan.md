Build a full mock web application called **ArchSight** — an AI-powered system design 

visualization platform for developers. The app should have a Framer-quality design: 

dark theme, glassmorphism cards, smooth gradients, subtle animated backgrounds, 

premium typography, and pixel-perfect spacing. Use Tailwind CSS + shadcn/ui components.

---

## DESIGN SYSTEM

- Background: Deep dark #0A0A0F with subtle purple/blue radial gradients

- Primary accent: Electric indigo/violet (#6366F1 to #8B5CF6 gradient)

- Secondary accent: Cyan/teal (#06B6D4)

- Cards: Glass morphism — bg-white/5, backdrop-blur-xl, border border-white/10

- Text: White primary, zinc-400 secondary, zinc-600 muted

- Font: Inter or Geist

- Buttons: Gradient primary (indigo→violet), ghost variants with border

- All data is mocked/hardcoded — NO real backend calls

---

## PAGES TO BUILD

### 1. LANDING PAGE (/landing or /)

Hero Section:

- Large headline: "Your Codebase. Understood." (gradient text: indigo→cyan)

- Subheadline: "ArchSight connects to your repo and automatically generates live 

  architecture diagrams, AI insights, and LLM cost analysis."

- Two CTA buttons: "Get Started Free" (primary gradient) + "View Demo" (ghost)

- Floating mockup/screenshot of the dashboard in the hero (can be a styled div 

  showing fake nodes/graph)

- Subtle animated grid or dot pattern background

- 3-4 floating "badge" pills showing: "AI Powered" "GitHub Connected" 

  "Real-time Analysis"

Features Section (3 columns, glass cards):

- 🔍 Repository Intelligence — "Connect GitHub, GitLab or Bitbucket. We parse 

  your entire codebase automatically."

- 🕸 Live Architecture Graph — "Visual service maps with nodes for APIs, DBs, 

  Queues, Workers, and LLM providers."

- 🤖 AI Engineering Insights — "Detect circular deps, god services, N+1 queries, 

  bottlenecks and more."

- 💰 LLM Cost Engine — "Estimate your monthly AI spend per endpoint. Get 

  optimization suggestions."

- 📊 Change Monitoring — "Track architecture complexity over time. See diffs 

  between scans."

- 🔐 Team Ready — "Invite your team. Share architecture snapshots."

How It Works Section (numbered steps, horizontal flow):

1. Connect your repository

2. We scan and parse your code

3. Architecture graph is generated

4. AI analyzes structure and returns insights

5. View your dashboard

Pricing Section (3 tiers):

- Starter: Free — 1 repo, 3 scans/month, basic insights

- Pro: $29/mo — 10 repos, unlimited scans, LLM cost engine, AI insights

- Team: $99/mo — Unlimited repos, team access, monitoring, priority support

Each card is glassy. Pro card has a "Most Popular" badge and brighter border.

Footer: Logo, nav links, social icons, "Built for developers who care about architecture"

---

### 2. AUTH PAGES

/auth/login:

- Centered card, glassmorphism, dark bg

- Title: "Welcome back"

- Subtitle: "Sign in to your ArchSight account"

- "Continue with GitHub" button (black, GitHub icon)

- "Continue with GitLab" button

- Divider "or"

- Email + Password fields (styled dark inputs)

- "Sign in" primary gradient button

- Link to signup

/auth/signup:

- Same glass card style

- "Create your account"

- GitHub OAuth button (primary)

- Or: Name, Email, Password fields

- "Start for free" CTA

- Terms of service note at bottom

---

### 3. MAIN DASHBOARD (/dashboard)

Top Nav:

- ArchSight logo (left) with small lightning bolt icon

- Nav links: Dashboard, Repositories, Insights, Cost Analysis

- Right: notification bell, user avatar dropdown

Left Sidebar (collapsible):

- Icons + labels: Overview, Repositories, Scans, Insights, Cost Engine, 

  Settings, Docs

- Active state: gradient pill background

Dashboard Overview Page:

- Welcome header: "Good morning, Alex 👋"

- Stat cards row (4 cards, glassmorphism):

  - Total Repos: 4

  - Last Scan: 2 hours ago

  - Active Insights: 12

  - Est. Monthly LLM Cost: $847

- Recent Scans table (repo name, scan time, status badge, insight count, action button)

  - Statuses: Completed (green), In Progress (yellow spinner), Failed (red)

- Quick Actions section: "Scan New Repo" button, "View All Insights" button

- Architecture Health Score widget: big circular score "74/100" with color ring 

  (yellow-orange), label "Needs Attention"

- Recent Insights preview: 3 cards showing risk alerts with severity badges

---

### 4. REPOSITORIES PAGE (/repositories)

- Page title: "Repositories" with "Connect New Repo" button (top right, gradient)

- Filter bar: All | GitHub | GitLab | Bitbucket | search input

- Repository cards grid (2-3 columns):

  Each card shows:

  - Repo name + org (e.g., "acme-corp / backend-api")

  - Platform icon (GitHub/GitLab)

  - Language badges (Node.js, Python, etc.)

  - Last scanned: "2 hours ago"

  - Services detected: 8

  - Insights: 5 critical, 3 warnings

  - Architecture score: 74/100 with mini ring chart

  - Buttons: "View Architecture" (primary) + "Scan Now" (ghost)

- Show 4-6 mock repository cards with realistic fake data

Connect Repo Modal (triggered by button):

- Step 1: Choose platform (GitHub / GitLab / Bitbucket) — 3 big clickable tiles

- Step 2: Select organization and repo from dropdown (mocked list)

- Step 3: Confirm and scan

- Modal is glassmorphism, multi-step with progress indicator

---

### 5. REPOSITORY DETAIL PAGE (/repositories/[id])

Sub-tabs: Overview | Architecture Graph | Insights | Cost Analysis | History

**Overview Tab:**

- Repo header: name, org, branch, last scan time, "Scan Now" button

- Stats row: Services (12), Routes (47), DB Models (8), Queue Jobs (4), 

  External APIs (6), LLM Calls (23)

- Detected Stack badges: Node.js, Express, PostgreSQL, Redis, OpenAI, Stripe API

- Services list (table): service name, type, file path, dependencies count, 

  risk level badge

**Architecture Graph Tab:**

- Full-width dark canvas area (just a styled mock, not a real graph library needed)

- Show floating node cards positioned on canvas:

  - "API Gateway" node (blue glow)

  - "UserService" node (indigo)

  - "AuthService" node (indigo)

  - "PostgreSQL" node (green glow, DB type)

  - "Redis Cache" node (yellow glow)

  - "OpenAI API" node (purple glow, LLM type)

  - "Stripe API" node (blue glow, External)

  - "EmailWorker" node (orange glow, Worker type)

- Draw SVG lines between them (hardcoded positions)

- Node legend (bottom left): colored dots with labels for each node type

- Top toolbar: "Zoom In" "Zoom Out" "Reset" "Export PNG" (all non-functional, 

  just styled buttons)

- Clicking a node opens a right panel showing: node name, type, file path, 

  connected to: [list], risk alerts

**Insights Tab:**

- Filter bar: All | Critical | Warning | Info | by Type dropdown

- Insight cards list:

  Each card:

  - Severity badge (Critical=red, Warning=yellow, Info=blue)

  - Issue type (e.g., "Circular Dependency", "God Service Detected", 

    "Missing Cache Layer", "N+1 Query Risk", "High LLM Coupling")

  - Affected service name

  - AI suggestion text (1-2 sentences)

  - "View in Graph" button

  

  Show 6-8 mock insight cards with varied severities and types

**Cost Analysis Tab:**

- Header: "Estimated Monthly LLM Cost: $847.20"

- Breakdown table:

  - Endpoint | Model Used | Avg Tokens | Calls/day | Monthly Cost

  - /api/chat | gpt-4o | 2,400 | 850 | $612.00

  - /api/summarize | gpt-4-turbo | 1,200 | 420 | $180.00

  - /api/embeddings | text-embedding-3 | 800 | 1200 | $55.20

- AI Optimization Suggestions (3 cards):

  - "Switch /api/chat to Claude Haiku — save ~$380/mo"

  - "Add Redis caching for /api/summarize — reduce calls by 60%"

  - "Enable batch embeddings — save ~$20/mo"

- Projected savings banner: "Potential savings: $487/mo" (green gradient bg)

**History Tab:**

- Timeline of scans (vertical timeline UI)

- Each scan entry: date, services count, insight count, complexity score, 

  "View Snapshot" button

- Show delta indicators (↑2 services, ↓3 insights, complexity +5)

---

### 6. INSIGHTS PAGE (/insights)

- Page-level view of all insights across all repos

- Filter: by repo, severity, issue type

- Insight cards in a masonry or list layout

- Same card design as repo insights tab

- Summary bar at top: 3 Critical | 7 Warnings | 12 Info

---

## COMPONENT REQUIREMENTS

- All inputs, modals, dropdowns use shadcn/ui components

- Toasts for mock actions (e.g., "Scan started!", "Repository connected!")

- Loading skeleton states on cards

- Hover states on all interactive elements

- Sidebar highlights active route

- Mobile responsive (sidebar collapses to hamburger on mobile)

- Smooth page transitions

---

## MOCK DATA

Use realistic hardcoded data throughout:

- Repos: "backend-api", "frontend-web", "data-pipeline", "auth-service"

- Orgs: "acme-corp", "startupxyz"

- Services: UserService, AuthService, PaymentService, NotificationWorker, 

  EmailWorker, ReportService

- Insights with real engineering problem descriptions

- LLM cost numbers that look realistic

- Scan timestamps that look recent

Do NOT add any real API calls, authentication logic, or database connections. 

Everything is purely UI/UX with mocked state.