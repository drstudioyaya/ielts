export default async function handler(req, res) {
  const attemptId = req.query.attemptId || "mock";

  return res.status(200).json({
    version: "scoreResponse.v1",
    attemptId,
    overall: {
      rawCorrect: 0,
      rawTotal: 40,
      band: 0,
      cefr: "NA",
      timeSpentSec: 0,
      headlineCn: "API已跑通（这是mock报告）。"
    },
    sections: [],
    dimensions: [],
    errorLabels: [],
    evidenceSnapshot: [],
    actionPlan: [],
    paywall: { freeVisible: ["overall"], locked: ["dimensions_full12", "errorLabels_full"] }
  });
}
