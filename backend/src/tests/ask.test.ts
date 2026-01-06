import { buildPrompt } from "../lib/prompt";

describe("buildPrompt", () => {
  it("formats context sources and the question", () => {
    const prompt = buildPrompt("What is the policy?", [
      { docId: "doc-1", title: "Policy", text: "Refunds within 30 days." },
      { docId: "doc-2", title: "FAQ", text: "Digital goods are final sale." }
    ]);

    expect(prompt).toContain("Source 1");
    expect(prompt).toContain("Doc: doc-1");
    expect(prompt).toContain("Title: Policy");
    expect(prompt).toContain("Refunds within 30 days.");
    expect(prompt).toContain("Source 2");
    expect(prompt).toContain("Question: What is the policy?");
  });
});
