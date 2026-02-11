# Neural Cortex — Full Project Explanation

> **Neural Cortex** is an AI-powered **Personal Knowledge Twin** — a web application that ingests your documents, builds a knowledge graph, and lets you converse with an AI that _remembers everything you've ever uploaded_. Think of it as a second brain that organizes, connects, and retrieves your knowledge on demand.

---

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema (Prisma)](#4-database-schema-prisma)
5. [Authentication System](#5-authentication-system)
6. [AI / LLM Integration (NVIDIA)](#6-ai--llm-integration-nvidia)
7. [Core Features & Pages](#7-core-features--pages)
   - [Landing Page](#71-landing-page)
   - [Dashboard](#72-dashboard)
   - [Vault (Document Management)](#73-vault-document-management)
   - [Converse (AI Chat)](#74-converse-ai-chat)
   - [Studio (Knowledge Graph)](#75-studio-knowledge-graph)
   - [Insights (Analytics)](#76-insights-analytics)
   - [Settings](#77-settings)
8. [API Routes](#8-api-routes)
   - [Auth Routes](#81-auth-routes)
   - [Brain Routes](#82-brain-routes)
   - [Document Routes](#83-document-routes)
   - [Ingest Routes](#84-ingest-routes)
9. [Document Ingestion Pipeline](#9-document-ingestion-pipeline)
10. [Knowledge Graph System](#10-knowledge-graph-system)
11. [RAG (Retrieval-Augmented Generation)](#11-rag-retrieval-augmented-generation)
12. [Design System & UI](#12-design-system--ui)
13. [Environment Variables](#13-environment-variables)
14. [How to Run Locally](#14-how-to-run-locally)
15. [Deployment](#15-deployment)

---

## 1. High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        FRONTEND (Next.js 14)                     │
│  Landing Page │ Dashboard │ Vault │ Converse │ Studio │ Insights │
│               │           │       │          │        │          │
│  React 18 + Framer Motion + Tailwind CSS + Lucide Icons          │
└────────────────────────────┬─────────────────────────────────────┘
                             │  API Routes (Next.js App Router)
                             ▼
┌──────────────────────────────────────────────────────────────────┐
│                        BACKEND (API Layer)                       │
│                                                                  │
│  /api/auth/*       → NextAuth (Google OAuth + Credentials)       │
│  /api/ingest/*     → Document upload, parsing, AI processing     │
│  /api/brain/*      → AI chat (RAG), knowledge graph, briefs      │
│  /api/documents/*  → CRUD operations on documents                │
└────────┬──────────────────┬──────────────────┬───────────────────┘
         │                  │                  │
         ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────────┐  ┌──────────────────┐
│  MySQL (TiDB)│  │  NVIDIA LLM API  │  │  Vercel Blob     │
│  via Prisma  │  │  (Llama / Mistral)│  │  (File Storage)  │
│  ORM         │  │                  │  │                  │
└──────────────┘  └──────────────────┘  └──────────────────┘
```

**Data flows:**
1. User uploads a document → parsed (PDF, DOCX, PPTX, TXT) → stored in MySQL + Vercel Blob
2. AI processes the document → generates summary, entities, key points, embeddings → builds knowledge graph
3. User asks a question → RAG retrieves relevant documents + cross-conversation context → NVIDIA LLM answers
4. Knowledge graph visualized in real-time via `react-force-graph-2d`

---

## 2. Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 14 (App Router) | Full-stack React framework with SSR/SSG |
| **Language** | TypeScript | Type safety across frontend & backend |
| **Database** | MySQL (TiDB Serverless) | Cloud-hosted MySQL-compatible DB |
| **ORM** | Prisma 5 | Type-safe database queries & migrations |
| **Auth** | NextAuth v4 | Google OAuth + email/password credentials |
| **AI / LLM** | NVIDIA API (Llama 3.3 70B, Mistral Large 2) | Chat completion, summarization, entity extraction |
| **File Storage** | Vercel Blob | Persistent file storage for uploaded documents |
| **File Parsing** | `pdf-parse`, `mammoth`, `jszip` | Extract text from PDF, DOCX, PPTX files |
| **Styling** | Tailwind CSS 3 | Utility-first CSS with custom neon dark theme |
| **Animations** | Framer Motion | Page transitions, hover effects, entrance animations |
| **Icons** | Lucide React | Modern, consistent icon system |
| **Graph Viz** | `react-force-graph-2d` | Interactive 2D force-directed knowledge graph |
| **UI Utilities** | `clsx`, `tailwind-merge` | Conditional class merging |
| **Markdown** | `react-markdown` + `remark-gfm` | Rendering AI responses in rich markdown |
| **Notifications** | `react-hot-toast` | Toast notifications for success/error feedback |
| **Password Hashing** | `bcryptjs` | Secure password storage |
| **Email** | `nodemailer` | OTP emails for password reset |

---

## 3. Project Structure

```
neural-cortex/
├── prisma/
│   ├── schema.prisma          # Database schema (9 models)
│   └── dev.db                 # Local dev SQLite fallback
│
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Landing page (public)
│   │   ├── layout.tsx                  # Root layout (providers, fonts, toaster)
│   │   ├── globals.css                 # Global styles + design tokens
│   │   │
│   │   ├── signin/page.tsx             # Sign-in page
│   │   ├── signup/page.tsx             # Sign-up page
│   │   ├── forgot-password/page.tsx    # Forgot password page
│   │   ├── set-password/page.tsx       # Set password (for Google OAuth users)
│   │   │
│   │   ├── (dashboard)/               # Protected route group
│   │   │   ├── layout.tsx              # Auth guard + Sidebar + Navbar
│   │   │   ├── dashboard/page.tsx      # Dashboard (stats + morning brief)
│   │   │   ├── vault/page.tsx          # Document management
│   │   │   ├── converse/page.tsx       # AI chat interface
│   │   │   ├── studio/page.tsx         # Knowledge graph visualization
│   │   │   ├── insights/page.tsx       # Analytics & statistics
│   │   │   └── settings/page.tsx       # User preferences
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   ├── [...nextauth]/route.ts    # NextAuth handler
│   │       │   ├── signup/route.ts           # User registration
│   │       │   ├── set-password/route.ts     # Set password
│   │       │   ├── forgot-password/route.ts  # Request OTP
│   │       │   ├── verify-otp/route.ts       # Verify OTP code
│   │       │   ├── reset-password/route.ts   # Reset password
│   │       │   └── delete-account/route.ts   # Account deletion
│   │       │
│   │       ├── brain/
│   │       │   ├── query/route.ts      # AI chat (RAG + streaming)
│   │       │   ├── graph/route.ts      # Knowledge graph data
│   │       │   └── brief/route.ts      # Morning brief generation
│   │       │
│   │       ├── documents/route.ts      # Document CRUD
│   │       └── ingest/
│   │           └── document/route.ts   # Document upload + AI processing
│   │
│   ├── components/
│   │   ├── shared/
│   │   │   ├── Sidebar.tsx             # Navigation sidebar
│   │   │   └── Navbar.tsx              # Top navigation bar
│   │   └── providers/
│   │       └── SessionProvider.tsx      # NextAuth session provider
│   │
│   ├── lib/
│   │   ├── auth.ts                     # NextAuth configuration
│   │   ├── nvidia.ts                   # NVIDIA AI API integration
│   │   ├── prisma.ts                   # Prisma client singleton
│   │   └── utils.ts                    # Utility functions
│   │
│   └── types/
│       ├── next-auth.d.ts              # NextAuth type extensions
│       └── modules.d.ts               # Module declarations
│
├── package.json
├── tailwind.config.js
├── next.config.js
├── tsconfig.json
├── postcss.config.js
└── .env                                # Environment variables
```

---

## 4. Database Schema (Prisma)

The application uses **9 Prisma models** connected to a MySQL database (TiDB Serverless):

### User Model (Central)
```prisma
model User {
  id             String    @id @default(cuid())
  email          String?   @unique
  name           String?
  password       String?           # bcrypt hash (null for Google OAuth users)
  needsPassword  Boolean   @default(false)  # Flag for Google users to set password
  phone          String?
  image          String?
  emailVerified  DateTime?
  accounts       Account[]
  sessions       Session[]
  documents      Document[]
  conversations  Conversation[]
  knowledgeNodes KnowledgeNode[]
  insights       Insight[]
  otpCodes       OtpCode[]
}
```

### Document Model
Stores all ingested documents with AI-generated metadata:
- `content` — raw text (extracted from PDF/DOCX/PPTX/TXT)
- `summary` — AI-generated 2-3 sentence summary
- `entities` — JSON array of extracted entities
- `keyPoints` — JSON array of key points
- `tags` — JSON array of auto-generated tags (top 5 entities)
- `embedding` — 128-dimensional vector for similarity search
- `fileUrl` — Vercel Blob URL for the original uploaded file
- `domain` — category (default: "general")
- `accessCount` — tracks how often the document is referenced

### Conversation & Message Models
```
Conversation (1) ──── has many ──── (N) Message
```
Each message stores:
- `role` — "user" or "assistant"
- `content` — the message text (supports markdown)
- `sources` — JSON array of `{id, title}` references to documents used

### KnowledgeNode Model
Graph nodes extracted from documents:
- `label` — the entity/concept name
- `type` — "concept", "entity", "idea", or "document"
- `strength` — numerical weight (increases with more references)
- `connections` — JSON array of connected node IDs
- `description` — origin description

### Insight Model
AI-generated insights about the user's knowledge:
- `type`, `title`, `description`
- `relatedDocs` — JSON references
- `confidence` — 0-1 confidence score
- `acknowledged` — whether user has seen it

### Auth Models
- **Account** — OAuth provider accounts (Google)
- **Session** — Active user sessions
- **VerificationToken** — Email verification tokens
- **OtpCode** — One-time passwords for password reset

### Entity Relationship Diagram

```
User ──┬── has many ──→ Document ──── AI generates ──→ KnowledgeNode
       │                                                    │
       ├── has many ──→ Conversation ── has many ──→ Message │
       │                                                    │
       ├── has many ──→ KnowledgeNode ◄── connections ──────┘
       │
       ├── has many ──→ Insight
       │
       ├── has many ──→ Account (OAuth)
       ├── has many ──→ Session
       └── has many ──→ OtpCode
```

---

## 5. Authentication System

### Overview
Neural Cortex uses **NextAuth v4** with two authentication providers:

| Provider | Flow |
|----------|------|
| **Google OAuth** | User signs in with Google → Account created → Redirected to set a local password → Full access |
| **Email/Password** | User signs up with email → Password hashed with bcrypt → Credentials login |

### Key Auth Flows

**1. Sign Up (Email/Password)**
- `POST /api/auth/signup` → Validates email uniqueness → Hashes password → Creates user
- Redirects to `/signin`

**2. Google OAuth First Login**
- Google sign-in via NextAuth → User created by Prisma Adapter
- `needsPassword` flag set to `true` → Redirected to `/set-password`
- User sets a local password → `needsPassword` set to `false` → Dashboard access

**3. Password Reset**
- `POST /api/auth/forgot-password` → Generates 6-digit OTP → Sends via nodemailer
- `POST /api/auth/verify-otp` → Validates OTP (expiry + single-use check)
- `POST /api/auth/reset-password` → Updates password hash

**4. Session Management**
- JWT strategy (not database sessions)
- Session includes `user.id` and `needsPassword` flag
- Dashboard layout checks `needsPassword` and redirects if true

### Protected Routes
The `(dashboard)/layout.tsx` acts as an auth guard:
- Checks `getServerSession()` → redirects to `/signin` if unauthenticated
- Checks `needsPassword` → redirects to `/set-password` if Google user hasn't set password

---

## 6. AI / LLM Integration (NVIDIA)

### `src/lib/nvidia.ts` — The AI Engine

All AI functionality flows through the NVIDIA API (`integrate.api.nvidia.com`), using the chat completions endpoint.

#### Model Fallback Chain
```
1. meta/llama-3.3-70b-instruct   (Primary — fast, reliable)
2. meta/llama-3.1-70b-instruct   (Fallback 1)
3. mistralai/mistral-large-2-instruct  (Fallback 2)
```
If the primary model fails (rate limit, downtime), it automatically tries the next model.

#### Core Functions

| Function | Purpose | Temperature |
|----------|---------|-------------|
| `nvidiaChat()` | General chat completion (non-streaming) | configurable |
| `nvidiaChatStream()` | Streaming chat via SSE (Server-Sent Events) | configurable |
| `generateSummary()` | 2-3 sentence document summary | 0.3 (precise) |
| `extractEntitiesWithTypes()` | Extract entities classified as concept/entity/idea | 0.1 (deterministic) |
| `extractKeyPoints()` | Extract key points as JSON array | 0.2 (precise) |
| `generateEmbeddingSimple()` | Simple 128-dim word-frequency embedding | N/A (local) |

#### Embedding System
Rather than calling an external embedding API, Neural Cortex uses a lightweight **local embedding function**:
- Splits text into words
- Maps character codes to a 128-dimensional vector
- Normalizes to unit length
- Used for cosine similarity search during RAG

This is a trade-off: faster and free (no API calls), but less semantically rich than transformer-based embeddings.

---

## 7. Core Features & Pages

### 7.1 Landing Page
**File:** `src/app/page.tsx`

A premium animated landing page featuring:
- Animated particle background (25 floating particles)
- Hero section with gradient text and CTAs
- Feature cards with hover effects (Neural Memory, Knowledge Graph, AI Conversations, Privacy First)
- Framer Motion entrance animations
- Adapts CTA based on auth state (Sign In vs. Dashboard)

### 7.2 Dashboard
**File:** `src/app/(dashboard)/dashboard/page.tsx`

The main hub showing:
- **Time-based greeting** ("Good Morning/Afternoon/Evening")
- **Stats grid** — Documents, Conversations, Knowledge Nodes, Insights counts
- **AI Morning Brief** — A personalized 3-4 sentence summary generated by the LLM based on recent documents and activity
- **Quick action cards** — Upload Document, Start Conversation, Explore Graph
- **Getting Started guide** for new users

### 7.3 Vault (Document Management)
**File:** `src/app/(dashboard)/vault/page.tsx`

Document management with:
- **Drag-and-drop upload** via `react-dropzone` (supports PDF, DOCX, PPTX, TXT, MD, JSON, CSV, etc.)
- **File list** with metadata (title, type, domain, creation date, access count)
- **Search** across document titles
- **AI Processing** — trigger re-analysis with "Process with AI" button per document
- **Document viewer** — expand to see content, summary, key points, and entities
- **Delete** with confirmation
- Auto-generated tags and entity extraction

### 7.4 Converse (AI Chat)
**File:** `src/app/(dashboard)/converse/page.tsx`

Full-featured AI chat interface:
- **Conversation sidebar** — list, create, delete conversations
- **Streaming responses** via SSE (Server-Sent Events) for real-time typing effect
- **Markdown rendering** in AI responses (code blocks, lists, headings, links)
- **File attachment** — upload documents directly from chat (triggers ingestion pipeline)
- **Source citations** — shows which documents were referenced in AI answers
- **Cross-conversation context** — the AI remembers insights from OTHER conversations
- **Keyboard shortcuts** (Enter to send, Shift+Enter for new line)
- Auto-scrolling and loading states

### 7.5 Studio (Knowledge Graph)
**File:** `src/app/(dashboard)/studio/page.tsx`

Interactive 2D knowledge graph visualization:
- **Force-directed graph** using `react-force-graph-2d`
- **Color-coded nodes** by type:
  - 🔵 Cyan (`#00f0ff`) — Concepts
  - 🟣 Purple (`#b829f7`) — Entities
  - 🔴 Pink (`#ff0080`) — Documents
  - 🟢 Green (`#00ff88`) — Ideas
- **Node details panel** — click a node to see label, type, and strength
- **Fullscreen mode**
- **Refresh** to reload graph data
- Node size scales with `strength` value
- Links between nodes from shared document context

### 7.6 Insights (Analytics)
**File:** `src/app/(dashboard)/insights/page.tsx`

Analytics dashboard showing:
- **Overall stats** — total documents, conversations, nodes, insights
- **Top Entities** — most frequently extracted entities with occurrence counts
- **Knowledge Domains** — breakdown of document domains
- **Recent Documents** — latest uploads with timestamps
- **Activity timeline** visualization

### 7.7 Settings
**File:** `src/app/(dashboard)/settings/page.tsx`

User preferences including:
- **Profile section** — avatar display, name, email
- **Theme settings** (dark mode is default)
- **Notification preferences**
- **Account management** — delete account option
- Save functionality with toast notifications

---

## 8. API Routes

### 8.1 Auth Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `*` | `/api/auth/[...nextauth]` | NextAuth catch-all handler (sign in, sign out, callbacks) |
| `POST` | `/api/auth/signup` | Register new user with email/password |
| `POST` | `/api/auth/set-password` | Set password for Google OAuth users |
| `POST` | `/api/auth/forgot-password` | Send OTP email for password reset |
| `POST` | `/api/auth/verify-otp` | Verify the OTP code |
| `POST` | `/api/auth/reset-password` | Reset password using verified OTP |
| `DELETE` | `/api/auth/delete-account` | Permanently delete user account |

### 8.2 Brain Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/brain/query?list=true` | List all user conversations |
| `GET` | `/api/brain/query?conversationId=X` | Load messages for a conversation |
| `POST` | `/api/brain/query` | Send message to AI (RAG + streaming) |
| `DELETE` | `/api/brain/query?conversationId=X` | Delete a conversation |
| `GET` | `/api/brain/graph` | Fetch knowledge graph nodes + links |
| `GET` | `/api/brain/brief` | Generate AI morning brief + stats |

### 8.3 Document Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `GET` | `/api/documents` | Fetch all user documents |
| `DELETE` | `/api/documents?id=X` | Delete a document |

### 8.4 Ingest Routes

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/ingest/document` | Upload & ingest document (file or text) |
| `PATCH` | `/api/ingest/document?id=X` | Re-process existing document with AI |

---

## 9. Document Ingestion Pipeline

When a user uploads a document, here's the complete processing flow:

```
1. UPLOAD
   ├── File received via multipart/form-data or JSON body
   ├── File type detected (PDF, DOCX, PPTX, TXT, MD, etc.)
   └── Original file uploaded to Vercel Blob (preserves formatting)

2. TEXT EXTRACTION
   ├── PDF  → pdf-parse library extracts text
   ├── DOCX → mammoth library extracts raw text
   ├── PPTX → jszip decompresses → XML slide text extracted
   └── TXT/MD/JSON → read as UTF-8

3. DATABASE STORAGE
   └── Document record created with raw content, file URL, metadata

4. AI PROCESSING (async, non-blocking)
   ├── generateSummary()        → 2-3 sentence summary
   ├── extractEntitiesWithTypes() → classify as concept/entity/idea
   ├── extractKeyPoints()        → structured key points
   └── generateEmbeddingSimple() → 128-dim vector for similarity search

5. KNOWLEDGE GRAPH CONSTRUCTION
   ├── Each entity → KnowledgeNode (created or strength increased)
   ├── Document → KnowledgeNode of type "document"
   ├── All entities from same document → connected to each other
   └── All entities → connected to their source document node
```

**Supported file types:** PDF, DOCX, PPTX, TXT, MD, Markdown, JSON, CSV, XML, HTML, CSS, JS, TS, PY

---

## 10. Knowledge Graph System

The knowledge graph is built automatically from document ingestion:

### Node Types
| Type | Description | Color | Example |
|------|-------------|-------|---------|
| `entity` | Named things (people, orgs, tools) | Purple | "PostgreSQL", "Google" |
| `concept` | Abstract topics, fields, methodologies | Cyan | "Machine Learning", "Normalization" |
| `idea` | Opinions, insights, hypotheses | Green | "NoSQL is better for scale" |
| `document` | Source document representation | Pink | "Research Paper on AI" |

### Connection Logic
- All entities extracted from the **same document** are connected to each other
- Every entity is connected to its **source document node**
- Node `strength` increases by 0.5 each time an entity appears in a new document
- Connections are stored as JSON arrays of node IDs
- Duplicate links are prevented using a Set-based deduplication

### Visualization
The Studio page renders the graph using `react-force-graph-2d`:
- **Node size** = `strength * 3` (more references → larger node)
- **Node color** = based on type (concept=cyan, entity=purple, document=pink, idea=green)
- **Links** drawn between connected nodes
- **Click interaction** shows node details in a side panel

---

## 11. RAG (Retrieval-Augmented Generation)

The `/api/brain/query` route implements a RAG pipeline:

### Step 1: Document Retrieval
```
User's message → Generate query embedding (128-dim)
                    ↓
Fetch all user documents → Score each by:
  1. Keyword matching (count of overlapping words)
  2. Cosine similarity (embedding distance × 5 weight)
                    ↓
Take top 3 documents with score > 0
```

### Step 2: Cross-Conversation Context
```
Fetch 5 most recent OTHER conversations
  → Get last 10 assistant messages
  → Score by keyword relevance to current query
  → Take top 3 relevant messages
```

### Step 3: Prompt Construction
```
System prompt = Neural Cortex persona
              + Top 3 document summaries/content
              + Cross-conversation insights
              + Guidelines (markdown, concise, reference docs)

Conversation history = Last 10 messages in current chat
```

### Step 4: AI Response
- **Streaming mode:** SSE stream via `nvidiaChatStream()` → real-time typing effect
- **Non-streaming fallback:** Single response via `nvidiaChat()`
- Response saved to database with source document references
- Conversation timestamp updated

---

## 12. Design System & UI

### Color Palette
Neural Cortex uses a **cyberpunk/neon dark theme**:

| Token | Hex | Usage |
|-------|-----|-------|
| `bg-primary` | `#0a0a0f` | Page background |
| `bg-secondary` | `#12121a` | Cards, sidebar |
| `bg-tertiary` | `#1a1a25` | Hover states |
| `neon-blue` | `#00f0ff` | Primary accent, CTAs |
| `neon-purple` | `#b829f7` | Secondary accent |
| `neon-pink` | `#ff0080` | Tertiary accent |
| `neon-green` | `#00ff88` | Success states |
| `text-primary` | `#ffffff` | Headings, body |
| `text-secondary` | `#a0a0b0` | Muted text |
| `border-custom` | `#2a2a3a` | Borders & dividers |

### Key CSS Components
- **`.glass`** — Glassmorphism effect (`rgba(255,255,255,0.04)` + `backdrop-filter: blur(12px)`)
- **`.glass-strong`** — Stronger glassmorphism for prominent cards
- **`.gradient-text`** — Blue-to-purple-to-pink gradient text
- **`.neon-glow`** — Cyan box-shadow glow effect
- **`.card-hover`** — Lift + shadow on hover
- **`.neural-bg`** — Subtle radial gradient background
- **`.btn-primary`** — Gradient button with hover glow
- **`.input-dark`** — Dark-themed input fields
- **`.animated-gradient`** — Moving background gradient
- **`.particle`** — Floating particle animation

### Animations
| Animation | Duration | Effect |
|-----------|----------|--------|
| `float` | 6s | Vertical bob (±20px) |
| `glow` | 2s | Pulsing neon box-shadow |
| `gradient-x` | 15s | Background gradient shift |
| `fade-in` | 0.5s | Opacity 0→1 |
| `slide-up` | 0.5s | Translate Y + fade in |
| `pulse-slow` | 3s | CSS pulse animation |
| `particle-float` | 8s | Multi-point translation path |

---

## 13. Environment Variables

| Variable | Service | Description |
|----------|---------|-------------|
| `DATABASE_URL` | TiDB Serverless | MySQL connection string with SSL |
| `NVIDIA_API_KEY` | NVIDIA API | API key for LLM inference |
| `NEXTAUTH_SECRET` | NextAuth | JWT signing secret |
| `NEXTAUTH_URL` | NextAuth | Application base URL |
| `GOOGLE_CLIENT_ID` | Google Cloud | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google Cloud | OAuth client secret |
| `BLOB_READ_WRITE_TOKEN` | Vercel Blob | Token for file storage |

---

## 14. How to Run Locally

### Prerequisites
- Node.js 18+
- npm or yarn
- A MySQL database (or TiDB Serverless)

### Steps

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
# Copy .env.example to .env and fill in your values
cp .env.example .env

# 3. Generate Prisma client
npx prisma generate

# 4. Push database schema
npx prisma db push

# 5. Start development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### Available Scripts

| Script | Command | Purpose |
|--------|---------|---------|
| `dev` | `next dev` | Start development server |
| `build` | `prisma generate && next build` | Production build |
| `start` | `next start` | Start production server |
| `lint` | `next lint` | Run ESLint |
| `db:push` | `prisma db push` | Push schema to database |
| `db:reset` | `prisma db push --force-reset` | Reset & re-push schema |

---

## 15. Deployment

### Vercel (Recommended)
Neural Cortex is designed for Vercel deployment:

1. **Frontend + API:** Deploy as a standard Next.js app on Vercel
2. **Database:** Use TiDB Serverless (MySQL-compatible, free tier available)
3. **File Storage:** Vercel Blob (automatic with token)
4. **Environment Variables:** Set all variables in Vercel dashboard

### Key Configuration
- `next.config.js` allows remote images from Google (`lh3.googleusercontent.com`)
- `postinstall` script runs `prisma generate` automatically on deploy
- Webpack config polyfills `fs`, `net`, `tls` for client-side bundles

---

## Summary

Neural Cortex is a full-stack **AI knowledge management platform** that:

1. **Ingests** documents in multiple formats (PDF, DOCX, PPTX, TXT, and more)
2. **Processes** them with AI to extract summaries, entities, key points, and embeddings
3. **Builds** an interconnected knowledge graph automatically
4. **Enables** intelligent conversations with RAG-powered AI that references your documents and past conversations
5. **Visualizes** your knowledge as an interactive force-directed graph
6. **Provides** analytics and AI-generated daily briefs about your knowledge base
7. **Secures** everything with multi-provider authentication and per-user data isolation

All wrapped in a premium dark-mode cyberpunk UI with glassmorphism, neon accents, and smooth animations.
