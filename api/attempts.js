const crypto = require("crypto");

/**
 * api/attempts.js (REST版，最稳)
 * - POST /api/attempts
 * - Insert into Supabase via REST endpoint:  {SUPABASE_URL}/rest/v1/attempts
 * - Always returns JSON: { attemptId } or { error, message }
 */

function safeParseBody(req) {
  try {
    if (!req || req.body == null) return {};
    if (typeof req.body === "string") return JSON.parse(req.body);
    return req.body;
  } catch {
    return {};
  }
}

module.exports = async (req, res) => {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "method_not_allowed" });
    }

    const body = safeParseBody(req);

    const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
    const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({
        error: "missing_supabase_env",
        hasUrl: !!SUPABASE_URL,
        hasServiceRoleKey: !!SUPABASE_KEY,
      });
    }

    const attemptId = "a_" + Date.now() + "_" + crypto.randomBytes(4).toString("hex");

    const row = {
      id: attemptId,
      test_id: body.testId || "premium-test1",
      section: body.section || null, // "1".."4" or "full"
      score_local: Number.isFinite(body.scoreLocal) ? body.scoreLocal : null,
      answers: body.answers || {},

      name: body.contact?.name || "",
      wechat: body.contact?.wechat || "",
      email: body.contact?.email || "",
      consent_marketing: !!body.contact?.consentMarketing,

      paid: false,
    };

    let r;
    try {
      r = await fetch(`${SUPABASE_URL}/rest/v1/attempts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          Prefer: "return=minimal",
        },
        body: JSON.stringify(row),
      });
    } catch (e) {
      return res.status(500).json({
        error: "supabase_network_error",
        message: String(e && e.message ? e.message : e),
      });
    }

    if (!r.ok) {
      const text = await r.text().catch(() => "");
      return res.status(500).json({
        error: "supabase_insert_failed",
        status: r.status,
        message: text || "(no response body)",
      });
    }

    return res.status(200).json({ attemptId });
  } catch (e) {
    return res.status(500).json({
      error: "server_error",
      message: String(e && e.message ? e.message : e),
    });
  }
};
