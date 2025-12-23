export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");

  const body = typeof req.body === "string" ? JSON.parse(req.body) : (req.body || {});
  const attemptId = "a_" + Date.now();

  // MVP：先写入 Vercel KV/数据库前，先临时用内存不行（会丢），所以这里先“回传 attemptId”
  // 下一步我们会把它写到数据库（Supabase/Neon/Vercel Postgres 任选其一）
  return res.status(200).json({ attemptId });
}
