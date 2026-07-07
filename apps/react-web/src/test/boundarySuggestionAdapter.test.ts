import { generateBoundarySuggestionsFromText } from "../data/boundarySuggestionAdapter";

describe("boundarySuggestionAdapter", () => {
  it("extracts common technical boundaries even when the role family is not backend", () => {
    const suggestions = generateBoundarySuggestionsFromText({
      profile: { targetRole: "实施顾问", roleFamily: "implementation" },
      text: "JD 要求 MQ、Redis、稳定性，面试官反馈需要补齐故障恢复和线上补偿证据。",
      existingTopics: []
    });

    expect(suggestions.map((item) => item.topic)).toEqual(expect.arrayContaining(["MQ", "Redis", "稳定性"]));
    expect(suggestions[0]).toMatchObject({
      topic: "MQ",
      level: "可讲",
      confidence: "high",
      sourceConfidence: "high",
      sourceProvider: "local-fallback",
      sourcePromptVersion: "coach-boundary-suggestions-v1"
    });
    expect(suggestions[0].sourceSummary).toContain("JD 要求 MQ");
    expect(suggestions[0].sourceInputHash).toMatch(/^[a-f0-9]{8}$/);
    expect(suggestions[0].gap).toContain("故障场景");
    expect(suggestions[0].targetUse).toContain("实施顾问");
  });

  it("skips already saved topics and refuses very short source text", () => {
    expect(generateBoundarySuggestionsFromText({
      profile: { targetRole: "后端工程师", roleFamily: "backend" },
      text: "太短",
      existingTopics: []
    })).toEqual([]);

    const suggestions = generateBoundarySuggestionsFromText({
      profile: { targetRole: "后端工程师", roleFamily: "backend" },
      text: "JD 要求 MQ、Redis、稳定性，面试官追问故障恢复。",
      existingTopics: ["MQ"]
    });

    expect(suggestions.some((item) => item.topic === "MQ")).toBe(false);
    expect(suggestions.some((item) => item.topic === "Redis")).toBe(true);
  });
});
