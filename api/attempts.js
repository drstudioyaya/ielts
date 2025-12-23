export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const attemptId = "a_" + Date.now();

  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SUPABASE_KEY) return res.status(500).send("Missing SUPABASE env vars");

  const row = {
    id: attemptId,
    test_id: body.testId || "premium-test1",
    section: body.section || null,
    score_local: Number.isFinite(body.scoreLocal) ? body.scoreLocal : null,
    answers: body.answers || {},
    name: body.contact?.name || "",
    wechat: body.contact?.wechat || "",
    email: body.contact?.email || "",
    consent_marketing: !!body.contact?.consentMarketing,
    paid: false
  };

  const r = await fetch(`${SUPABASE_URL}/rest/v1/attempts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": SUPABASE_KEY,
      "Authorization": `Bearer ${SUPABASE_KEY}`,
      "Prefer": "return=minimal"
    },
    body: JSON.stringify(row)
  });

  if (!r.ok) {
    const text = await r.text();
    return res.status(500).send(`Supabase insert failed: ${r.status} ${text}`);
  }

  return res.status(200).json({ attemptId });
}
