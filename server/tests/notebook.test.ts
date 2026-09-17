import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import {
  createPage,
  createSource,
  getPage,
  listPages,
  listSources,
  validatePageInput,
  validateSourceInput,
  buildNotebookContext,
  _resetStoreForTests,
} from "../services/notebookService.js";
import { searchSources } from "../services/embedService.js";

beforeEach(() => {
  _resetStoreForTests();
});

describe("notebookService validation", () => {
  it("rejects empty page title", () => {
    assert.equal(validatePageInput({ title: "" }), "title must be a non-empty string");
  });

  it("rejects invalid source type", () => {
    const err = validateSourceInput({ type: "invalid", title: "Test", content: "Hello" });
    assert.ok(err?.includes("type must be one of"));
  });

  it("accepts valid source input", () => {
    assert.equal(validateSourceInput({ type: "text", title: "Note", content: "Body" }), null);
  });
});

describe("notebookService CRUD", () => {
  it("creates and lists pages", () => {
    const page = createPage({ title: "Bài 1", content: "Nội dung" });
    assert.equal(listPages().length, 1);
    assert.equal(getPage(page.id)?.title, "Bài 1");
  });

  it("creates sources with token count", () => {
    const source = createSource({
      type: "text",
      title: "Doc",
      content: "machine learning neural network deep learning",
    });
    assert.ok(source.tokenCount && source.tokenCount > 0);
    assert.equal(listSources().length, 1);
  });

  it("builds notebook context from page and sources", () => {
    const source = createSource({ type: "text", title: "Ref", content: "Important fact" });
    const page = createPage({ title: "Lesson", content: "My notes", sourceIds: [source.id] });
    const ctx = buildNotebookContext(page.id);
    assert.ok(ctx.includes("Lesson"));
    assert.ok(ctx.includes("Important fact"));
  });
});

describe("embedService search", () => {
  it("returns relevant snippets for a query", () => {
    const s1 = createSource({
      type: "text",
      title: "React",
      content: "React is a JavaScript library for building user interfaces with components.",
    });
    const s2 = createSource({
      type: "text",
      title: "Cooking",
      content: "How to bake a chocolate cake with flour and eggs.",
    });

    const results = searchSources(listSources(), "React components user interface");
    assert.ok(results.length >= 1);
    assert.equal(results[0].sourceId, s1.id);
    assert.ok(results[0].score > 0);
    assert.ok(results[0].snippet.length > 0);

    // unrelated source should rank lower or be excluded
    const lowRank = results.find((r) => r.sourceId === s2.id);
    if (lowRank) assert.ok(lowRank.score < results[0].score);
  });

  it("returns empty for blank query tokens", () => {
    createSource({ type: "text", title: "X", content: "some text here" });
    assert.deepEqual(searchSources(listSources(), "   "), []);
  });
});
