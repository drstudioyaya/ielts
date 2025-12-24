const { createClient } = require("@supabase/supabase-js");

function mockReport(attemptId = "mock") {
  return {
    version: "scoreResponse.v1",
    attemptId,
    overall: {
      rawCorrect: 0,
      rawTotal: 40,
      band: 0,
      cefr: "NA",
      timeSpentSec: 0,
      headlineCn: "API已跑通（这是mock报告）。",
    },
    sections: [],
    dimensions: [],
    errorLabels: [],
    evidenceSnapshot: [],
    actionPlan: [],
    paywall: {
      freeVisible: ["overall"],
      locked: ["dimensions_full12", "errorLabels_full"],
    },
  };
}

module.exports = async (req, res) => {
  try {
    const attemptId = String(req.query.attemptId || "").trim();

    if (!attemptId) {
      return res.status(400).json({ error: "missing_attemptId" });
    }

    // 继续允许 mock
    if (attemptId === "mock") {
      return res.status(200).json(mockReport("mock"));
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return res.status(500).json({
        error: "missing_supabase_env",
        hasUrl: !!supabaseUrl,
        hasServiceRoleKey: !!serviceKey,
      });
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: attempt, error } = await supabase
      .from("attempts")
      .select("*")
      .eq("id", attemptId)
      .single();

    if (error || !attempt) {
      return res.status(404).json({ error: "attempt_not_found", attemptId });
    }

    const section = String(attempt.section || "");
    const totalBySection = { "1": 10, "2": 10, "3": 10, "4": 10，"full": 40 };
    const rawTotal = totalBySection[section] ?? 10;
    const rawCorrect = Number(attempt.score_local ?? 0);

    return res.status(200).json({
      version: "scoreResponse.v1",
      attemptId,
      overall: {
        rawCorrect,
        rawTotal,
        band: null,
        cefr: "NA",
        timeSpentSec: 0,
        headlineCn: `已生成真实报告：Section ${section} 本地判分 ${rawCorrect}/${rawTotal}（已写入数据库）`,
      },
      sections: [{ section, rawCorrect, rawTotal }],
      dimensions: [],
      errorLabels: [],
      evidenceSnapshot: [],
      actionPlan: [],
      paywall: {
        freeVisible: ["overall", "sections"],
        locked: ["dimensions_full12", "errorLabels_full"],
      },
    });
  } catch (e) {
    return res.status(500).json({
      error: "server_error",
      message: String(e && e.message ? e.message : e),
    });
  }
};
