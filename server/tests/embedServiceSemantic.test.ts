import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { searchSourcesSemantic } from "../services/embedService.js";
import type { NotebookSource } from "../services/notebookService.js";

describe("embedService semantic search (The Librarian - Đội 2)", () => {
  it("returns empty array for blank query or empty sources", async () => {
    const res1 = await searchSourcesSemantic([], "React");
    assert.deepEqual(res1, []);

    const dummySource: NotebookSource = {
      id: "src1",
      type: "text",
      title: "Title",
      content: "Content",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const res2 = await searchSourcesSemantic([dummySource], "   ");
    assert.deepEqual(res2, []);
  });

  it("semantically ranks relevant documents higher", async () => {
    const sources: NotebookSource[] = [
      {
        id: "src-tech",
        type: "text",
        title: "Lập trình Web",
        content: "Học lập trình giao diện người dùng frontend với React, TypeScript và các thành phần component tái sử dụng.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: "src-food",
        type: "text",
        title: "Nấu ăn gia đình",
        content: "Cách làm món canh chua cá lóc và thịt kho tàu thơm ngon đậm đà hương vị miền Tây.",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const results = await searchSourcesSemantic(sources, "xây dựng giao diện web React", 2);
    assert.ok(results.length >= 1, "Should return results");
    assert.equal(results[0].sourceId, "src-tech", "Tech source should be ranked first");
    assert.ok(results[0].score > 0, "Score should be positive");
  });
});
