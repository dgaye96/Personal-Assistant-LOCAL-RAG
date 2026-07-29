# Assistant personnel RAG local

Assistant et coach personnel qui s'appuie exclusivement sur les informations stockees sur votre machine. Cette version livre le socle RAG local, l'ingestion de documents et de notes : Qdrant, Ollama, SQLite, une API FastAPI a flux SSE et une interface React.

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
          +---- Qdrant (localhost:6333): vecteurs
```

Qdrant utilise une collection unique, `personal_assistant_chunks`. Chaque vecteur portera un champ `kb_id`; cette approche rend la future recherche sur plusieurs bases possible dans une requete filtree tout en conservant une seule configuration de vecteurs. Les ports Qdrant sont lies a `127.0.0.1` et la telemetrie est desactivee. Le backend refuse aussi toute URL de service qui ne cible pas `localhost`, `127.0.0.1` ou `::1`.

## Prerequis

- Docker Desktop
- Ollama pour Windows
- Python 3.11 ou plus recent
- Node.js 20 ou plus recent

## Lancer les services locaux

1. Demarrez Qdrant depuis la racine du projet :

   ```powershell
   docker compose up -d
   ```

2. Installez et lancez Ollama, puis telechargez les modeles. Le modele de chat peut etre remplace par un modele francophone local compatible avec votre machine.

   ```powershell
   ollama pull llama3.1:8b
   ollama pull nomic-embed-text
   ```

3. Creez le fichier local de configuration si vous souhaitez changer les modeles ou parametres :

   ```powershell
   Copy-Item .env.example backend\.env
   ```

## Lancer l'application

### Demarrage en une commande

Depuis la racine du projet, lancez le script PowerShell :

```powershell
.\Start-Assistant.ps1
```

Le script demarre Qdrant, verifie qu'Ollama repond localement, cree l'environnement Python si necessaire, installe les dependances absentes puis lance FastAPI et Vite. Ouvrez ensuite `http://localhost:5173`.

Lors d'un demarrage ulterieur, quand les dependances sont deja installees, vous pouvez ignorer leur verification :

```powershell
.\Start-Assistant.ps1 -SkipInstall
```

Si PowerShell bloque le script pour cette session uniquement, executez une fois :

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
```

### Demarrage manuel

1. Dans un premier terminal, installez les dependances backend et demarrez FastAPI :

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   pip install -r backend\requirements.txt
   Set-Location backend
   uvicorn app.main:app --reload --port 8000
   ```

2. Dans un second terminal, demarrez le frontend :

   ```powershell
   Set-Location frontend
   npm install
   npm run dev
   ```

3. Ouvrez `http://localhost:5173`.

## Langues de l'interface

L'interface est disponible en francais et en anglais. Utilisez le selecteur `FR / EN` dans l'en-tete pour changer de langue. Le choix est conserve localement dans le navigateur et est reapplique au prochain demarrage. Les noms de bases, documents, notes et conversations deja enregistres ne sont pas modifies.

## Ajouter des connaissances

Au premier demarrage, l'application cree une `Base personnelle` avec l'identifiant `1`. La page **Bases de connaissances** permet de lister les bases, en creer de nouvelles, modifier leur nom ou description et les supprimer. L'indexation utilise toujours la base selectionnee. Depuis cette page, collez une note ou importez plusieurs fichiers PDF, DOCX, TXT ou MD de 20 Mo maximum chacun, par selection ou glisser-deposer. Une note et des fichiers ne peuvent pas etre envoyes simultanement.

L'endpoint `POST /ingest` accepte aussi une note via un formulaire :

```powershell
$form = @{ kb_id = '1'; note = 'J ai travaille comme analyste de donnees et je maitrise Python et SQL.' }
Invoke-RestMethod -Method Post -Uri http://localhost:8000/ingest -ContentType 'application/x-www-form-urlencoded' -Body $form
```

Le serveur conserve le texte brut dans SQLite, le decoupe en morceaux avec chevauchement, genere les embeddings par Ollama puis envoie les vecteurs a Qdrant. Si l'indexation Qdrant echoue, le document SQLite est retire afin de ne pas conserver de document incomplet.

Lorsqu'une base est supprimee, ses documents SQLite et les vecteurs Qdrant ayant le meme `kb_id` sont egalement supprimes. Les endpoints de gestion sont :

```text
GET    /knowledge-bases
POST   /knowledge-bases
PUT    /knowledge-bases/{id}
DELETE /knowledge-bases/{id}
```

## Premier test de bout en bout

Avec Qdrant et Ollama demarres, ajoutez d'abord une note, puis interrogez le chat. La collection Qdrant est creee automatiquement a la premiere indexation. Les sources affichees sous la reponse doivent contenir les extraits de la note ou du document utilise. Sans source qui atteint le seuil, la reponse reste `information insuffisante` et le LLM n'est pas appele.

```powershell
Invoke-RestMethod http://localhost:8000/health
$body = @{ question = 'Que sais-tu de mon experience ?'; kb_ids = @() } | ConvertTo-Json -Compress
(Invoke-WebRequest -UseBasicParsing -Method Post -Uri http://localhost:8000/chat -ContentType 'application/json' -Body $body).Content
```

Le flux SSE contient des evenements `token`, `sources` et `done`. Lorsque des sources existeront, la reponse LLM sera diffusee token par token et les extraits seront renvoyes dans l'evenement `sources`.

## Historique des conversations

Chaque question demarre une nouvelle conversation ou rejoint le fil selectionne. La question, la reponse complete et les sources RAG associees sont conservees uniquement dans `backend/assistant.db` (SQLite local). La page **Chat** affiche cet historique et permet de recharger un fil enregistre. Ce chemin est fixe, y compris lorsque FastAPI est lance depuis la racine du projet : les bases de connaissances et l'historique restent donc disponibles entre les demarrages.

Les endpoints locaux disponibles sont :

```text
GET /conversations
GET /conversations/{id}
```

## Etat du developpement

Cette livraison couvre les etapes 1 et 2, la gestion locale des bases et l'historique local : socle local, garde-fou anti-hallucination, endpoint `POST /chat`, ingestion PDF/DOCX/TXT/MD ou notes libres, bases CRUD, conversations SQLite et chat React avec rendu incremental. Les prochaines etapes implementeront la selection multi-bases dans le chat, les reglages/persona persistants et la personnalisation complete du theme.