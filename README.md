# Genealadin - Intelligence Platform

Web scraping and data analysis service for companies, private investigators, and legal professionals in the Middle East.

## 📋 Overview

Genealadin provides:
- 🔍 Deep web scraping from multiple layers of internet sources
- 📊 Data aggregation and analysis for Middle Eastern region
- ⚖️ Legal-compliant intelligence gathering
- 🏢 Enterprise-grade API for multiple user types

## 👥 Target Users

- **Companies** - Competitive intelligence, market research
- **Private Investigators** - Information gathering, public records
- **Legal Professionals** - Legal research, documentation, case analysis
- **Organizations** - Custom research solutions

## 🚀 Tech Stack

- **Backend:** Python 3.11+ with FastAPI
- **Scraping:** Scrapy + Selenium for JS-heavy sites
- **Database:** PostgreSQL
- **Task Queue:** Celery + Redis
- **API:** RESTful with JWT authentication
- **Deployment:** Docker + GitHub Actions

## 📁 Project Structure

```
genealadin/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── endpoints/
│   │   │   │   │   ├── scraping.py
│   │   │   │   │   ├── search.py
│   │   │   │   │   ├── users.py
│   │   │   │   │   └── reports.py
│   │   │   │   └── dependencies.py
│   │   │   └── utils.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── security.py
│   │   │   └── auth.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── scraping_job.py
│   │   │   ├── data_source.py
│   │   │   └── report.py
│   │   ├── schemas/
│   │   │   └── (Pydantic schemas)
│   │   ├── db/
│   │   │   ├── base.py
│   │   │   ├── session.py
│   │   │   └── migrations/
│   │   ├── scrapers/
│   │   │   ├── base_scraper.py
│   │   │   ├── middle_east_sources/
│   │   │   │   ├── news.py
│   │   │   │   ├── legal.py
│   │   │   │   ├── corporate.py
│   │   │   │   └── public_records.py
│   │   │   └── tasks.py
│   │   └── main.py
│   ├── requirements.txt
│   ├── pyproject.toml
│   ├── Dockerfile
│   └── .env.example
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── docs/
│   ├── api.md
│   ├── scraping.md
│   ├── deployment.md
│   └── legal_compliance.md
├── .github/
│   └── workflows/
│       ├── tests.yml
│       ├── lint.yml
│       └── deploy.yml
├── docker-compose.yml
└── .gitignore
```

## ⚡ Quick Demo (proof of concept)

A working slice of the platform is implemented: register/login with JWT auth,
two real scrapers (RSS/Atom feeds, and a generic HTML scraper for pages
without a feed), keyword search over scraped results, and a reports endpoint
that aggregates matches by source. Backed by SQLite by default so there's
nothing else to install.

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### For a non-technical user: a plain Hebrew web UI

Open **http://localhost:8000/** — a simple client-facing page (register, log in,
search, add a source to track, run a person search, generate a report) with no
technical jargon, JSON, or API concepts visible. This is what to hand a client;
`/docs` below is for developers.

### For developers: the interactive API docs

Open http://localhost:8000/docs and try it:

1. `POST /api/v1/auth/register` — create a user
2. `POST /api/v1/auth/login` — get a JWT (use the "Authorize" button in the docs UI)
3. `POST /api/v1/scraping/jobs`:
   - RSS/Atom: `{"source_name": "Demo Wire", "source_url": "<feed URL>", "source_type": "news"}`
   - HTML page (no feed): `{"source_name": "Demo Site", "source_url": "<page URL>", "source_type": "legal", "scraper_type": "html", "selector": ".headline a"}` — `selector` is any CSS selector pointing at the linked items
4. `GET /api/v1/scraping/results/{job_id}` — see what was scraped
5. `POST /api/v1/search` — e.g. `{"query": "trade"}`. This also live-queries Google News' own search feed for the term, saves whatever it finds, and includes it in the results — so search isn't limited to whatever was manually pre-scraped. Falls back to local-only search if the live fetch fails.
6. `POST /api/v1/reports` — e.g. `{"query": "trade"}` (optionally add `"source_type": "news"`) to get a saved report with a source breakdown and the matching articles
7. `GET /api/v1/reports/{report_id}` — re-fetch a saved report
8. `POST /api/v1/search/person` — e.g. `{"name": "John Smith"}` — same live-search behavior as above, plus surfaces any email addresses that co-occur with the name in the same scraped text. This is a co-occurrence lead for an investigator to verify, not a confirmed identity match — labelled as such in the response.

Run the test suite (covers all of this): `pytest` from `backend/`.

### Optional: Claude-powered entity extraction and AI summaries

Set `ANTHROPIC_API_KEY` (get one from [console.anthropic.com](https://console.anthropic.com) — note this is separate from a claude.ai chat subscription, which doesn't include API access) to unlock two things, both off by default so nothing calls the API — or spends money — unless you opt in per-request:

- `POST /api/v1/scraping/jobs` with `"extract_entities": true` uses Claude to pull names/emails/usernames/organizations out of each scraped item (instead of nothing) — this is what powers `search/person`'s email linking.
- `POST /api/v1/reports` with `"use_ai_summary": true` replaces the plain source-count breakdown with a short analyst-style summary of the matched articles.

Without the key, both flags are silently no-ops (extraction fields stay empty, report summary falls back to the plain breakdown) — nothing breaks, nothing is charged.

### Run with Docker (one command, real Postgres)

```bash
docker compose up --build
```

This builds the API image and starts it alongside a Postgres container —
no local Python/Postgres setup needed. The API is on http://localhost:8000/docs.
Data persists in a Docker volume across restarts; `docker compose down -v` wipes it.

The RSS scraper works with any public feed; the HTML scraper works with any
static page where a CSS selector can target the linked items (JS-heavy pages
still need the planned Selenium scraper below). Jobs run synchronously for
simplicity. The full production design (Scrapy/Selenium scrapers, Celery
task queue, Alembic migrations, multi-source aggregation) described below is
the next phase.

## 🔧 Installation

```bash
# Clone repository
git clone https://github.com/robebe4611-lang/genealadin.git
cd genealadin

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r backend/requirements.txt

# Setup environment
cp backend/.env.example backend/.env

# Run migrations
alembic upgrade head

# Start development server
uvicorn app.main:app --reload
```

## 📚 API Endpoints (Planned)

### Authentication
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

### Scraping Jobs
- `POST /api/v1/scraping/jobs` - Create new scraping job
- `GET /api/v1/scraping/jobs/{job_id}` - Get job status
- `GET /api/v1/scraping/results/{job_id}` - Get results

### Search & Analysis
- `POST /api/v1/search` - Search across all data
- `GET /api/v1/analysis/{entity_id}` - Get analysis report

### Reports
- `POST /api/v1/reports` - Generate custom report
- `GET /api/v1/reports/{report_id}` - Download report

## 🌍 Supported Regions & Sources

- 🇮🇱 Israel
- 🇸🇦 Saudi Arabia
- 🇦🇪 UAE
- 🇪🇬 Egypt
- 🇮🇷 Iran (Public records)
- 🇱🇧 Lebanon
- And more...

## ⚖️ Legal & Compliance

See [LEGAL_COMPLIANCE.md](docs/LEGAL_COMPLIANCE.md) for:
- GDPR compliance
- Data privacy regulations
- Ethical scraping guidelines
- Regional legal considerations

## 🤝 Contributing

See CONTRIBUTING.md for guidelines.

## 📄 License

MIT License - See LICENSE file

## 📞 Support

For issues and questions, please use GitHub Issues.
