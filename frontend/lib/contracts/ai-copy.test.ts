import { describe, expect, it } from "vitest";
import { parseCriteria, parseEvalSnapshot } from "@/lib/contracts/ai-copy";

describe("task eval helpers", () => {
  it("parses criteria json", () => {
    expect(parseCriteria('["a","b"]')).toEqual(["a", "b"]);
    expect(parseCriteria("nope")).toEqual([]);
  });

  it("parses last evaluation json", () => {
    const snap = parseEvalSnapshot(
      '{"status":"FAIL","failed_criteria":[1],"short_reason":"thin","criteria":[{"id":1,"met":false}]}'
    );
    expect(snap?.status).toBe("FAIL");
    expect(snap?.failed_criteria).toEqual([1]);
  });
});
