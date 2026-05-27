# JobPilot ✈️

AI-powered job search platform — find jobs, match your resume, and reach out to HR, all in one place.

## Features

- 🔍 **Job Search** — scrapes live jobs from LinkedIn, Naukri, Indeed, Unstop, and Internshala
- 🤖 **AI Matching** — matches your resume against job descriptions with skill gap analysis
- 📧 **Mail HR** — send personalised email applications directly to HR with your resume attached
- 📄 **Resume Management** — upload and parse your resume (PDF/DOCX)
- 💌 **Cover Letter Generator** — AI-generated personalised cover letters with PDF download
- 📊 **Applications Tracker** — track which jobs you've applied to and emailed
- 🗺️ **Office Location** — click the location on any job card to open it in Google Maps

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Vanilla CSS |
| Backend | Node.js, Express, MongoDB, Redis |
| AI | OpenAI GPT (configurable model) |
| Job Scraping | Playwright |
| Email | Nodemailer (SMTP / Gmail App Password) |
| Queues | BullMQ + Redis |

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Redis (local or cloud)
- OpenAI API key
- Gmail App Password (for HR email feature)

### Install & Run

```bash
# Backend
cd Backend
npm install
npm run dev

# Frontend (new terminal)
cd Frontend/vite-project
npm install
npm run dev
```

The app runs at **http://localhost:5173** and the API at **http://localhost:5000**.

### Environment Variables
Copy `Backend/.env.example` to `Backend/.env` and fill in:

```
MONGO_URI=...
REDIS_URL=...
JWT_SECRET=...
OPENAI_API_KEY=...
```
