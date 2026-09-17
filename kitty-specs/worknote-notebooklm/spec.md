# WorkNote NotebookLM Upgrade

## Vision
Build the next evolution of WorkNote as a NotebookLM-style knowledge workspace that helps learners and creators ingest sources, explore context, and extract insights from notes, transcripts, and documents.

## Existing Baseline
WorkNote already has a strong product base:
- React + TypeScript frontend with separated feature components and hook-based state.
- Express backend with routes for file processing, link ingestion, chat, TTS, translation, and live audio.
- Built-in mindmap, audio lab, RPG quiz, knowledge base, and student budget tracker UI modules.
- `server/config.ts` already defines upload limits, rate limiting, and Gemini concurrency controls.
- `.env.example` exists but can be expanded for local config and Firebase support.

## Problem Statement
WorkNote currently offers general AI utilities, chat, and document upload, but lacks an integrated notebook experience with:
- source-aware memory and retrieval
- linked notes / context-aware searches
- AI-powered summaries and question answering grounded in uploaded content
- a learning-focused UI for notebooks, mind maps, and quizzes

## Goals
- Enable users to create notebook entries and enrich them with source material.
- Support source ingestion from documents, transcripts, URLs, and YouTube captions.
- Provide a context-aware chat assistant that uses notebook content and sources.
- Add AI workflows for summaries, mind maps, flashcards, and quiz prompts.
- Keep WorkNote’s existing React + Express architecture and extend it cleanly.
- Stabilize the current app with better environment configuration, validation, and QA coverage.
- Make security the first priority by enforcing rate limiting, access controls, safe file handling, and preventing insecure direct object references.
- Embed code quality and consistency into the workflow with linting, coding standards, and integrated tests.

## Security and Quality Focus
- All backend endpoints must enforce request validation, rate limiting, and safe object access.
- The app must avoid exposing secrets to the browser and must validate request paths before using them.
- Development workflow must include lint, test, and pre-commit/hook checks for quality.

## User Stories
1. As a learner, I want to create a notebook page with text, images, and source citations.
2. As a learner, I want to upload documents or transcripts and search them from within a notebook.
3. As a learner, I want the assistant to answer questions using my uploaded sources and notebook notes.
4. As a learner, I want an AI-generated summary and quiz for my notebook content.
5. As a developer, I want a modular backend with source ingestion, embeddings, and chat context services.

## Acceptance Criteria
- A notebook workspace UI exists in `src/components` and can display notebook pages.
- Users can upload documents and associate sources with notebook entries.
- Source content is indexed and retrievable via a backend search/embeddings flow.
- A context-aware chat endpoint returns answers grounded in user sources.
- Notebook entries can request AI summaries and quizzes.

## Out of Scope
- Full production note versioning and collaboration.
- Large-scale vector DB integration beyond draft in-memory proof of concept.
- Multi-user role management.
