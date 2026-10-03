import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  generateMindMap,
  splitMindMapContent,
} from "../services/mindMapGenerationService.js";

describe("mindMapGenerationService", () => {
  it("splits long content without exceeding the requested chunk target", () => {
    const content = Array.from({ length: 12 }, (_, index) =>
      `## Chương ${index + 1}\n${"Nội dung học tập. ".repeat(40)}`
    ).join("\n\n");
    const chunks = splitMindMapContent(content, 1_200);

    assert.ok(chunks.length > 1);
    assert.ok(chunks.every((chunk) => chunk.length <= 1_200));
    assert.ok(chunks[0].includes("Chương 1"));
    assert.ok(chunks.at(-1)?.includes("Chương 12"));
  });

  it("maps multiple sources and reduces them into one stable tree", async () => {
    let calls = 0;
    const fakeGenerator = async (_task: "TEXT_SUMMARY", prompt: string) => {
      calls++;
      const isReduce = prompt.includes("Hợp nhất các dàn ý");
      return {
        provider: "local" as const,
        model: "test-local-model",
        text: isReduce
          ? JSON.stringify({ branches: [{ label: "Kiến thức tổng hợp", sourceIds: ["doc-a", "doc-b"], children: [] }] })
          : JSON.stringify({ branches: [{ label: "Ý chính", children: [{ label: "Chi tiết" }] }] }),
      };
    };

    const result = await generateMindMap("Notebook học tập", [
      { id: "doc-a", title: "Tài liệu A", content: "Nội dung quan trọng của tài liệu A." },
      { id: "doc-b", title: "Tài liệu B", content: "Nội dung quan trọng của tài liệu B." },
    ], fakeGenerator);

    assert.ok(calls >= 3);
    assert.equal(result.mindmap.id, "root");
    assert.equal(result.mindmap.label, "Notebook học tập");
    assert.equal(result.mindmap.children?.[0].label, "Kiến thức tổng hợp");
    assert.deepEqual(result.mindmap.children?.[0].sourceIds, ["doc-a", "doc-b"]);
    assert.equal(result.stats.sourceCount, 2);
    assert.equal(result.provider, "local");
  });
});
