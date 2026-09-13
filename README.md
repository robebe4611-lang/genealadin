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
a real RSS-feed scraper, and keyword search over the scraped results — all
backed by SQLite so there's nothing else to install.

```bash
cd backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open http://localhost:8000/docs and try it:

1. `POST /api/v1/auth/register` — create a user
2. `POST /api/v1/auth/login` — get a JWT (use the "Authorize" button in the docs UI)
3. `POST /api/v1/scraping/jobs` — e.g. `{"source_name": "Demo Wire", "source_url": "<any public RSS/Atom feed URL>", "source_type": "news"}`
4. `GET /api/v1/scraping/results/{job_id}` — see what was scraped
5. `POST /api/v1/search` — e.g. `{"query": "trade"}` to search stored articles

Run the test suite (covers this whole flow): `pytest` from `backend/`.

This scrapes RSS/Atom feeds specifically (public syndication endpoints, not
arbitrary page scraping), and jobs run synchronously for simplicity. The
production design (Scrapy/Selenium scrapers, Celery task queue, Postgres,
multi-source aggregation, reports) described below is the next phase.

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
