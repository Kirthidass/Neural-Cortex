<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind" />
  <img src="https://img.shields.io/badge/Prisma-5-2D3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/NVIDIA-AI-76B900?style=for-the-badge&logo=nvidia&logoColor=white" alt="NVIDIA" />
  <img src="https://img.shields.io/badge/HuggingFace-MoE-FFD21E?style=for-the-badge&logo=huggingface&logoColor=black" alt="HuggingFace" />
</p>

<h1 align="center">🧠 Neural Cortex</h1>

<p align="center">
  <strong>Your AI-Powered Personal Knowledge Twin</strong>
  <br />
  <em>Ingest. Connect. Converse. Remember everything.</em>
</p>

<p align="center">
  <a href="#-features">Features</a> •
  <a href="#-architecture">Architecture</a> •
  <a href="#-tech-stack">Tech Stack</a> •
  <a href="#-getting-started">Getting Started</a> •
  <a href="#-environment-variables">Environment Variables</a> •
  <a href="#-project-structure">Project Structure</a> •
  <a href="#-api-reference">API Reference</a>
</p>

---

## 🎯 What is Neural Cortex?

**Neural Cortex** is a full-stack AI application that acts as your **second brain**. Upload any document — PDFs, lecture notes, meeting recordings, presentations — and Neural Cortex will:

- **Extract knowledge** using multi-model AI (entities, summaries, key points)
- **Build a knowledge graph** showing how your ideas connect
- **Let you chat** with an AI that has perfect recall of everything you've uploaded
- **Search the web** and YouTube when your local knowledge isn't enough
- **Cross-validate answers** using multiple AI models to reduce hallucination

> Think of it as ChatGPT that actually remembers your files, connects your ideas, and never makes things up.

---

## ✨ Features

### 📂 Smart Document Vault
- Upload **PDFs, DOCX, PPTX, images, audio, and video** files
- AI-powered extraction: summaries, tags, key points, named entities
- OCR support for images via NVIDIA Llama 3.2 Vision
- Audio/video transcription via HuggingFace Whisper

### 💬 Conversational AI (RAG)
- Chat with your knowledge base using Retrieval-Augmented Generation
- **Multi-agent system** classifies user intent and routes to specialized experts
- Cross-conversation memory — the AI recalls insights from previous chats
- Streaming responses for real-time interaction

### 🌐 Web & YouTube Search
- Automatic internet search when local knowledge is insufficient
- YouTube video discovery with direct links
- Search results integrated into AI responses with source attribution

### 🧬 Knowledge Graph
- Interactive force-directed graph visualization
- Entity clustering by type (concepts, entities, documents, ideas)
- **Search box** to find and focus on any entity instantly
- Click any node to explore connections
- Auto-bridged disconnected clusters — no nodes fly off screen

### 🤖 Multi-Model Mixture of Experts
- **NVIDIA API**: Llama 3.3 70B, Llama 3.1 70B, Mistral Large 2 (fallback chain)
- **HuggingFace API**: Mistral 7B, BART Large CNN, Whisper Large v3
- **Consensus Summarization**: Two models summarize independently → merged keeping only agreed facts
- **Fact-Check Validation**: HuggingFace cross-validates NVIDIA responses

### 📊 Dashboard & Insights
- Overview of your knowledge base statistics
- AI-generated daily briefs
- Document analytics and access patterns

### 🔐 Authentication
- Google OAuth + email/password credentials
- OTP-based password reset via email
- Secure session management with NextAuth

---

## 🏗 Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js 14 App Router)               │
│  Landing │ Dashboard │ Vault │ Converse │ Studio │ Insights │ Settings │
│  React 18 + Framer Motion + Tailwind CSS + Lucide Icons            │
└──────────────────────────┬─────────────────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────────────────┐
│                     MULTI-AGENT ORCHESTRATOR                       │
│                                                                    │
│  User Query → Intent Classifier                                    │
│                    ├── Knowledge Expert (local RAG)                 │
│                    ├── Search Expert (DuckDuckGo web search)        │
│                    └── YouTube Expert (video search + links)        │
│                              │                                     │
│                    Context Aggregation + System Prompt Builder      │
│                              │                                     │
│                    NVIDIA LLM (primary response)                   │
│                              │                                     │
│                    HuggingFace (fact-check validation)              │
│                              │                                     │
│                    Final Response (hallucination-reduced)           │
└──────┬───────────────┬───────────────┬────────────────┬────────────┘
       │               │               │                │
       ▼               ▼               ▼                ▼
┌────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  MySQL     │ │  NVIDIA API  │ │ HuggingFace  │ │ Vercel Blob  │
│  (TiDB)    │ │  (4 models)  │ │  (3 models)  │ │ (file store) │
└────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 14 (App Router, Server Components) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 3.4 + Framer Motion |
| **Database** | MySQL (TiDB Serverless) via Prisma 5 |
| **Auth** | NextAuth v4 (Google OAuth + Credentials) |
| **AI — Primary** | NVIDIA API (Llama 3.3 70B, Llama 3.1 70B, Mistral Large 2) |
| **AI — Validation** | HuggingFace (Mistral 7B, BART Large CNN, Whisper v3) |
| **File Storage** | Vercel Blob |
| **Search** | DuckDuckGo HTML (no API key needed) |
| **Graph Viz** | react-force-graph-2d (d3-force) |
| **Doc Parsing** | mammoth (DOCX), unpdf (PDF), JSZip (PPTX) |
| **Icons** | Lucide React |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ and **npm**
- **MySQL** database (or [TiDB Serverless](https://tidbcloud.com/) — free tier)
- **NVIDIA API key** from [build.nvidia.com](https://build.nvidia.com/)
- **HuggingFace API key** from [huggingface.co/settings/tokens](https://huggingface.co/settings/tokens) (free)
- **Google OAuth credentials** (optional, for social login)

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/sakthi44710/neural-cortex.git
cd neural-cortex

# 2. Install dependencies
npm install

# 3. Set up environment variables
cp .env.example .env
# Edit .env with your credentials (see below)

# 4. Push database schema
npx prisma db push

# 5. Generate Prisma client
npx prisma generate

# 6. Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and start building your second brain.

---

## 🔑 Environment Variables

Create a `.env` file in the project root:

```env
# Database (MySQL / TiDB Serverless)
DATABASE_URL="mysql://user:password@host:port/database?ssl-mode=VERIFY_IDENTITY"

# NextAuth
NEXTAUTH_SECRET="your-random-secret-string"
NEXTAUTH_URL="http://localhost:3000"

# Google OAuth (optional)
GOOGLE_CLIENT_ID="your-google-client-id"
GOOGLE_CLIENT_SECRET="your-google-client-secret"

# NVIDIA AI API (required)
NVIDIA_API_KEY="nvapi-your-nvidia-api-key"

# HuggingFace API (required for MoE features)
HUGGINGFACE_API_KEY="hf_your-huggingface-api-key"

# Vercel Blob Storage
BLOB_READ_WRITE_TOKEN="vercel_blob_your-token"

# Email (for OTP password reset)
EMAIL_SERVER_HOST="smtp.gmail.com"
EMAIL_SERVER_PORT=587
EMAIL_SERVER_USER="your-email@gmail.com"
EMAIL_SERVER_PASSWORD="your-app-password"
EMAIL_FROM="your-email@gmail.com"
```

---

## 📁 Project Structure

```
neural-cortex/
├── prisma/
│   └── schema.prisma            # Database models (User, Document, Conversation, etc.)
├── src/
│   ├── app/
│   │   ├── page.tsx             # Landing page
│   │   ├── layout.tsx           # Root layout with providers
│   │   ├── globals.css          # Tailwind + custom theme
│   │   ├── (dashboard)/         # Authenticated pages
│   │   │   ├── dashboard/       # Overview stats
│   │   │   ├── vault/           # Document upload & management
│   │   │   ├── converse/        # AI chat interface
│   │   │   ├── studio/          # Knowledge graph visualization
│   │   │   ├── insights/        # Analytics & AI briefs
│   │   │   └── settings/        # Account settings
│   │   ├── api/
│   │   │   ├── auth/            # NextAuth + signup/OTP/password routes
│   │   │   ├── brain/           # AI chat, knowledge graph, briefs
│   │   │   ├── documents/       # Document CRUD
│   │   │   └── ingest/          # File upload + AI processing pipeline
│   │   ├── signin/              # Auth pages
│   │   ├── signup/
│   │   ├── forgot-password/
│   │   └── set-password/
│   ├── components/
│   │   ├── providers/           # SessionProvider
│   │   └── shared/              # Navbar, Sidebar
│   ├── lib/
│   │   ├── agents.ts            # Multi-agent MoE orchestrator
│   │   ├── auth.ts              # NextAuth configuration
│   │   ├── huggingface.ts       # HuggingFace API client
│   │   ├── nvidia.ts            # NVIDIA API client (chat, embeddings, OCR)
│   │   ├── prisma.ts            # Prisma client singleton
│   │   ├── search.ts            # DuckDuckGo web + YouTube search
│   │   └── utils.ts             # Utility functions
│   └── types/
│       ├── modules.d.ts         # Module declarations
│       └── next-auth.d.ts       # NextAuth type extensions
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── next.config.js
```

---

## 📡 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/signup` | Register new user |
| `POST` | `/api/auth/[...nextauth]` | NextAuth sign in (Google / Credentials) |
| `POST` | `/api/auth/forgot-password` | Send OTP to email |
| `POST` | `/api/auth/verify-otp` | Verify OTP code |
| `POST` | `/api/auth/reset-password` | Reset password with verified OTP |
| `POST` | `/api/auth/set-password` | Set password for OAuth users |
| `DELETE` | `/api/auth/delete-account` | Delete user account and all data |

### Brain (AI)
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/brain/query?list=true` | List conversations |
| `GET` | `/api/brain/query?conversationId=X` | Load conversation messages |
| `POST` | `/api/brain/query` | Send message (multi-agent RAG) |
| `DELETE` | `/api/brain/query?conversationId=X` | Delete conversation |
| `GET` | `/api/brain/graph` | Get knowledge graph data |
| `POST` | `/api/brain/graph` | Rebuild knowledge graph |
| `POST` | `/api/brain/brief` | Generate AI daily brief |

### Documents
| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/documents` | List user's documents |
| `DELETE` | `/api/documents?id=X` | Delete a document |
| `POST` | `/api/ingest/document` | Upload & process file with AI |
| `PATCH` | `/api/ingest/document?id=X` | Re-process document with AI |

---

## 🧩 Document Ingestion Pipeline

```
File Upload
    │
    ├── Text files (.txt, .md, .json, .csv) → Direct text extraction
    ├── DOCX → mammoth library → HTML → text
    ├── PDF → unpdf library → text (fallback: AI OCR)
    ├── PPTX → JSZip → XML parsing → text
    ├── Images → NVIDIA Llama 3.2 90B Vision → OCR text
    ├── Audio (.mp3, .wav, .m4a) → HuggingFace Whisper → transcription
    └── Video (.mp4, .webm, .mov) → HuggingFace Whisper → transcription
          │
          ▼
    AI Processing (NVIDIA Llama 3.3 70B)
    ├── Entity extraction (concepts, people, organizations, technologies)
    ├── Tag generation
    ├── Key point extraction
    ├── Domain classification
    └── Consensus summarization (NVIDIA + HuggingFace BART → merged)
          │
          ▼
    Database Storage + Knowledge Graph Node Creation
```

---

## 🤖 Multi-Model Agent System

Neural Cortex uses a **Mixture of Experts** approach for answering queries:

| Agent | Model | Purpose |
|-------|-------|---------|
| **Intent Classifier** | Keyword pattern matching | Routes query to appropriate experts |
| **Knowledge Expert** | Local RAG (embedding + keyword) | Searches user's document vault |
| **Search Expert** | DuckDuckGo web search | Finds information from the internet |
| **YouTube Expert** | DuckDuckGo YouTube search | Finds relevant video tutorials & lectures |
| **Primary LLM** | NVIDIA Llama 3.3 70B | Generates the final response |
| **Fact Checker** | HuggingFace Mistral 7B | Cross-validates response against context |
| **Summarizer** | HuggingFace BART Large CNN | Independent summarization for consensus |

### Anti-Hallucination Strategy

1. **Consensus Summarization**: Both NVIDIA and HuggingFace BART independently summarize content → a merger model keeps only facts both agreed on
2. **Fact-Check Validation**: After the primary LLM responds, HuggingFace Mistral 7B checks the response against the source context and flags unsupported claims
3. **Source Attribution**: Every response includes traceable sources (documents, web URLs, YouTube links)

---

## 🎨 Design System

Neural Cortex uses a custom **dark cyberpunk theme**:

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-primary` | `#0a0a0f` | Main background |
| `--bg-secondary` | `#12121a` | Card backgrounds |
| `--neon-blue` | `#00f0ff` | Primary accent |
| `--neon-purple` | `#b829f7` | Secondary accent |
| `--neon-pink` | `#ff0080` | Highlights |
| `--neon-green` | `#00ff88` | Success states |

Glass-morphism effects with `glass` and `glass-strong` utility classes. Neon glow effects with `neon-glow`.

---

## 📜 Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run db:push      # Push schema to database
npm run db:reset     # Reset database (destructive)
```

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables in Vercel dashboard
4. Deploy — Prisma generates automatically via `postinstall`

### Self-Hosted

```bash
npm run build
npm run start
```

Ensure `DATABASE_URL`, `NVIDIA_API_KEY`, `HUGGINGFACE_API_KEY`, and `NEXTAUTH_SECRET` are set in your environment.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is private and proprietary.

---

<p align="center">
  <strong>Built with 🧠 by the Neural Cortex Team</strong>
  <br />
  <em>Your knowledge, amplified.</em>
</p>
