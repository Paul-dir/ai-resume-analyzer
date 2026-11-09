# Resumind — AI Resume Analyzer & Reviewer

An AI-powered web application built with **React Router v7**, **TypeScript**, **Tailwind CSS v4**, and **Puter.js**. Resumind analyzes resumes against target job descriptions and provides detailed ATS scoring, feedback on content, structure, skills, tone & style, and actionable tips.

---

## ✨ Features

- 📄 **PDF Upload & Rendering**: Upload PDF resumes with drag-and-drop support, converting the first page into preview images directly in-browser using `pdfjs-dist`.
- 🤖 **AI-Powered Analysis**: Analyzes resumes with Claude 3.5 Sonnet through Puter.js, scoring ATS compatibility, tone & style, content quality, and skill gaps.
- 📊 **Detailed Scoring Breakdown**: Interactive score gauges, overall score calculation, and expandable accordion sections with tailored tips.
- 🗄️ **Persistent Cloud Storage**: Resumes and analysis data are stored in Puter KV & Filesystem per user account.
- 🔐 **Authentication**: One-click authentication with Puter.
- 📱 **Responsive Design**: Clean and responsive UI styled with Tailwind CSS v4.
- 🐳 **Production-Ready Docker Setup**: Multi-stage Docker build ready for deployment on any cloud provider (Google Cloud Run, AWS ECS, Fly.io, Railway, DigitalOcean).

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- npm (or pnpm / yarn)

### 1. Installation

```bash
npm install
```

### 2. Run Development Server

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 3. Type Checking & Production Build

```bash
# Type check TypeScript files
npm run typecheck

# Build for production
npm run build

# Start production server
npm run start
```

---

## 🐳 Docker Deployment

Build and run using Docker:

```bash
# Build the Docker image
docker build -t ai-resume-analyzer .

# Run the container on port 3000
docker run -p 3000:3000 ai-resume-analyzer
```

Deployable to:
- Google Cloud Run
- AWS ECS / App Runner
- Fly.io
- Railway / Render
- Azure Container Apps

---

## 🛠️ Tech Stack

- **Framework**: React Router v7 (SSR + Client Bundle)
- **Bundler**: Vite 7
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript 5
- **Backend Services & AI**: Puter.js (Auth, FS, KV, AI Chat)
- **PDF Processing**: `pdfjs-dist` + HTML5 Canvas
