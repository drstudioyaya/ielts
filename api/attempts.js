const { createClient } = require("@supabase/supabase-js");
const crypto = require("crypto");

/**
 * api/attempts.js
 * - Create attempt row in Supabase
 * - Always return JSON (so前端 r.json() 不会炸)
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

    const { error } = await supabase.from("attempts").insert(row);

    if (error) {
      return res.status(500).json({
        error: "supabase_insert_failed",
        message: error.message || String(error),
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
