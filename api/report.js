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

function safeObj(v) {
  if (!v) return null;
  if (typeof v === "object") return v;
  try { return JSON.parse(v); } catch { return null; }
}

module.exports = async (req, res) => {
  try {
    const attemptId = String(req.query.attemptId || "").trim();
    if (!attemptId) return res.status(400).json({ error: "missing_attemptId" });

    if (attemptId === "mock") return res.status(200).json(mockReport("mock"));

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
    const rawCorrect = Number(attempt.score_local ?? 0);
    const rawTotal = section === "full" ? 40 : 10;

    // ✅ 如果 full，尝试从 answers._meta.perSection 读出分项
    const answersObj = safeObj(attempt.answers);
    const perSection = answersObj?._meta?.perSection || null;

    let sections = [{ section, rawCorrect, rawTotal }];

    if (section === "full" && perSection) {
      sections = ["1", "2", "3", "4"].map((k) => ({
        section: k,
        rawCorrect: Number(perSection?.[k]?.rawCorrect ?? 0),
        rawTotal: Number(perSection?.[k]?.rawTotal ?? 10),
      }));
    }

    const headline =
      section === "full"
        ? `已生成真实报告：Full Test 本地判分 ${rawCorrect}/40（已写入数据库）`
        : `已生成真实报告：Section ${section} 本地判分 ${rawCorrect}/${rawTotal}（已写入数据库）`;

    return res.status(200).json({
      version: "scoreResponse.v1",
      attemptId,
      overall: {
        rawCorrect,
        rawTotal,
        band: null,
        cefr: "NA",
        timeSpentSec: 0,
        headlineCn: headline,
      },
      sections,
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
