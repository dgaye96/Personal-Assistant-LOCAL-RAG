# Local personal assistant RAG

Personal assistant and coach that relies exclusively on information stored on your machine. This version provides the local RAG foundation, document and note ingestion: Qdrant, Ollama, SQLite, an SSE-based FastAPI API, and a React interface.

## Architecture

```text
React/Vite (localhost:5173)
          |
          | POST /chat - SSE
          v
FastAPI (localhost:8000) ---- SQLite (assistant.db)
          |
          +---- Ollama (localhost:11434): LLM + embeddings
          |
          +---- Qdrant (localhost:6333): vectors
```

Qdrant uses a single collection, `personal_assistant_chunks`. Each vector carries a `kb_id` field; this approach makes future multi-knowledge-base search possible in a filtered query while keeping a single vector configuration. Qdrant ports are bound to `127.0.0.1` and telemetry is disabled. The backend also rejects any service URL that does not target `localhost`, `127.0.0.1`, or `::1`.

## Prerequisites

- Docker Desktop
- Ollama for Windows
- Python 3.11 or newer
- Node.js 20 or newer

## Start the local services

1. Start Qdrant from the project root:

   ```powershell
   docker compose up -d
   ```

2. Install and start Ollama, then download the models. The chat model can be replaced with any compatible local French model your machine can handle.

   ```powershell
   ollama pull llama3.1:8b
   ollama pull nomic-embed-text
   ```

3. Create the local config file if you want to change models or settings:

   ```powershell
   Copy-Item .env.example backend\.env
   ```

## Start the application

### One-command startup

From the project root, run the PowerShell script:

```powershell
.\Start-Assistant.ps1
```

The script starts Qdrant, checks that Ollama responds locally, creates the Python environment if needed, installs missing dependencies, then launches FastAPI and Vite. Open `http://localhost:5173` afterward.

On later startups, when dependencies are already installed, you can skip their verification:

```powershell
.\Start-Assistant.ps1 -SkipInstall
```

If PowerShell blocks the script for this session only, run once:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
```

### Manual startup

1. In one terminal, install backend dependencies and start FastAPI:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r backend\requirements.txt
   Set-Location backend
   uvicorn app.main:app --reload --port 8000
   ```

2. In a second terminal, start the frontend:

   ```powershell
   Set-Location frontend
   npm install
   npm run dev
   ```

3. Open `http://localhost:5173`.

## Interface languages

The interface is available in French and English. Use the `FR / EN` selector in the header to change the language. The choice is stored locally in the browser and restored on the next launch. Existing knowledge base, document, note, and conversation names are not changed.

## Add knowledge

On first launch, the app creates a `Base personnelle` knowledge base with ID `1`. The **Knowledge Bases** page lets you list bases, create new ones, rename or delete them, and edit their description. Indexing always uses the selected base. From this page, paste a note or import multiple PDF, DOCX, TXT, or MD files up to 20 MB each, either by selection or drag and drop. A note and files cannot be sent at the same time.

The `POST /ingest` endpoint also accepts a note through a form:

```powershell
$form = @{ kb_id = '1'; note = 'I worked as a data analyst and I am proficient in Python and SQL.' }
Invoke-RestMethod -Method Post -Uri http://localhost:8000/ingest -ContentType 'application/x-www-form-urlencoded' -Body $form
```

The server stores the raw text in SQLite, splits it into overlapping chunks, generates embeddings through Ollama, then sends the vectors to Qdrant. If Qdrant indexing fails, the SQLite document is removed so no partial document is kept.

When a knowledge base is deleted, its SQLite documents and Qdrant vectors with the same `kb_id` are also deleted. The management endpoints are:

```text
GET    /knowledge-bases
POST   /knowledge-bases
PUT    /knowledge-bases/{id}
DELETE /knowledge-bases/{id}
```

## First end-to-end test

With Qdrant and Ollama running, add a note first, then query the chat. The Qdrant collection is created automatically at the first indexing step. The sources shown under the answer should contain excerpts from the note or document used. Without any source above the threshold, the answer remains `insufficient information` and the LLM is not called.

```powershell
Invoke-RestMethod http://localhost:8000/health
$body = @{ question = 'What do you know about my experience?'; kb_ids = @() } | ConvertTo-Json -Compress
(Invoke-WebRequest -UseBasicParsing -Method Post -Uri http://localhost:8000/chat -ContentType 'application/json' -Body $body).Content
```

The SSE stream contains `token`, `sources`, and `done` events. When sources exist, the LLM response is streamed token by token and the excerpts are returned in the `sources` event.

## Conversation history

Each question starts a new conversation or continues the selected thread. The question, the full answer, and the associated RAG sources are stored only in `backend/assistant.db` (local SQLite). The **Chat** page shows this history and lets you reopen a saved thread. This path is fixed, even when FastAPI is launched from the project root: knowledge bases and history therefore remain available across restarts.

The available local endpoints are:

```text
GET /conversations
GET /conversations/{id}
```

## Development status

This release covers steps 1 and 2, local knowledge base management, and local history: local foundation, anti-hallucination guardrail, `POST /chat` endpoint, PDF/DOCX/TXT/MD ingestion or free-form notes, CRUD knowledge bases, SQLite conversations, and React chat with incremental rendering. The next steps will implement multi-base selection in chat, persistent settings/persona, and full theme customization.