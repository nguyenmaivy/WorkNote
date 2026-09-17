# NotebookLM WorkNote Implementation Plan

## Architecture Overview
Extend WorkNote’s existing React + Express/Vite application with a NotebookLM module that includes:
- Notebook page model and UI.
- Source ingestion service for files, transcripts, links, and YouTube captions.
- Search/embedding pipeline for source retrieval.
- Context-aware chat service that combines notebook content and source snippets.
- AI workflows for summaries, mind maps, and quizzes.

## Key Components
- `src/components/NotebookWorkspace.tsx` — notebook UI shell.
- `src/components/NotebookPageEditor.tsx` — notebook entry editor.
- `src/components/NotebookSourcePanel.tsx` — source management panel.
- `src/services/notebookService.ts` — frontend CRUD for notebook pages and sources.
- `src/services/sourceEmbedding.ts` — wrapper around embeddings and retrieval.
- `server/routes/notebook.ts` — notebook API endpoints.
- `server/services/notebookService.ts` — backend notebook and source ingestion logic.
- `server/services/embedService.ts` — embeddings, search, and retrieval.
- `server/services/geminiService.ts` — existing AI call integration.

## Data Flow
1. User uploads a document/transcript or adds a source link.
2. Backend ingests source and stores text/metadata in a notebook source store.
3. Source text is embedded for retrieval.
4. User creates/edits a notebook page and attaches sources.
5. User asks the context assistant a question.
6. Backend builds a retrieval context from notebook content + source embeddings and calls Gemini.
7. AI returns grounded answers, summaries, and quiz prompts.

## Risk & Mitigation
- In-memory retrieval is adequate for prototype; avoid premature production DB complexity.
- Keep UI/UX in a separate NotebookLM tab, so existing app features remain stable.
- Reuse WorkNote’s current upload and AI route patterns.

## Implementation Steps
1. Stabilize current app baseline: verify environment config, add `.env.example` fields, document backend secrets, and harden security controls.
2. Add notebook route and backend service interfaces.
3. Add frontend notebook workspace and page model.
4. Add source ingestion UI and backend source management.
5. Implement source retrieval / simple embedding search.
6. Add chat context endpoint using source-aware prompt assembly.
7. Add notebook summary and quiz actions.
8. Add tests for backend routes and source retrieval logic.
9. Add CI and validation checks for lint/build/test.
10. Integrate security review and code quality checks into the mission workflow.
