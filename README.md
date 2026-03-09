# Job Helper AI

A Chrome extension + admin panel that analyzes job descriptions against your resume using Claude AI. Supports job applications (LinkedIn, Indeed, Glassdoor, and 25+ job sites) and Upwork bids.

---

## Features

### Chrome Extension (Side Panel)
- **Auto-detect job pages** on LinkedIn, Indeed, Glassdoor, Greenhouse, Lever, Workday, and any job site
- **Floating action button** on every page - click to analyze
- **Two tabs**: Job Apply | Upwork Bid
- **Instant analysis** powered by Claude AI:
  - Location & remote/hybrid/onsite status
  - Match score (progress bar)
  - "Actually hiring?" signal
  - 1-2 sentence summary
  - Skills comparison (matched vs missing)
  - External apply links
- **Q&A generator** - paste interview questions, get tailored answers
- **Apply status tracking** - Not Applied / Applied / Interview / Rejected / Offer
- **Multi-applicant support** - switch between applicants via dropdown
- **Upwork tab** - manual paste mode (no scraping), generates bid drafts

### Admin Panel (Vercel)
- **Dashboard** - jobs table with site icon, title, summary, skills, match %, status, date
- **Applicants** - manage multiple applicants
- **Resume** - upload PDF, auto-parsed, auto-extracts skills
- **Portfolio** - add manually or fetch from URL (AI extracts project info)
- **Skills** - auto-populated from resume, editable
- **Training Materials** - separate for Job and Upwork, guides AI tone/style
- **Settings** - update auth credentials
- **Filters** - by applicant and date range

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Extension | Vanilla HTML/CSS/JS, Chrome Manifest V3, Side Panel API |
| Backend | Next.js (JavaScript), Prisma ORM |
| Database | Supabase (PostgreSQL) |
| AI | Claude API (Haiku 4.5) |
| Auth | JWT |
| Deploy | Vercel |

---

## Database Schema

```
User ── Applicant ─┬── Resume
                   ├── Portfolio
                   ├── Skill
                   ├── TrainingMaterial (job / upwork)
                   └── Job
```

---

## Setup

### 1. Clone

```bash
git clone https://github.com/srcore3524/job-helper-extension.git
cd job-helper-extension
```

### 2. Backend

```bash
cd web
cp .env.example .env
```

Fill in `.env`:

```
DATABASE_URL="your_supabase_pooled_connection_string"
DIRECT_URL="your_supabase_direct_connection_string"
JWT_SECRET="any_random_string"
ANTHROPIC_API_KEY="your_claude_api_key"
```

```bash
npm install
npx prisma db push
npm run dev
```

Backend runs at `http://localhost:3000`

### 3. Chrome Extension

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked**
4. Select the `extension/` folder
5. Click the extension icon to open the side panel
6. Login with credentials created on the admin panel

### 4. First Use

1. Go to `http://localhost:3000` and register an account
2. Add an applicant in **Applicants**
3. Upload resume PDF in **Resume** (skills auto-extracted)
4. Add portfolio items in **Portfolio**
5. Add training materials in **Training**
6. Open any job page, click the floating button, and start applying

---

## Deploy to Vercel

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com) - set root directory to `web/`
3. Add environment variables in Vercel project settings
4. Deploy
5. Update `DEFAULT_API_BASE` in `extension/sidepanel.js` and `extension/login.js` to your Vercel URL

---

## API Cost

Using Claude Haiku 4.5:

| Usage | Cost |
|-------|------|
| 1 job analysis | ~$0.004 |
| 1 answer generation | ~$0.006 |
| 30 applies/day | ~$0.21/day |
| Monthly (daily use) | ~$6-7/month |

---

## Project Structure

```
job-helper-extension/
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── content.js
│   ├── sidepanel.html / .css / .js
│   ├── login.html / .css / .js
│   ├── generate-icons.html
│   └── icons/
└── web/
    ├── app/
    │   ├── api/
    │   │   ├── analyze/
    │   │   ├── auth/ (login, register, update)
    │   │   ├── applicants/
    │   │   ├── resume/
    │   │   ├── portfolio/ (+ fetch/)
    │   │   ├── skills/
    │   │   ├── training/
    │   │   ├── jobs/
    │   │   └── generate-answer/
    │   ├── dashboard/
    │   │   ├── applicants/
    │   │   ├── resume/
    │   │   ├── portfolio/
    │   │   ├── skills/
    │   │   ├── training/
    │   │   └── settings/
    │   └── login/
    ├── lib/ (prisma, auth, claude)
    ├── prisma/schema.prisma
    └── middleware.js
```

---

## License

MIT
