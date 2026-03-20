const { createClient } = require("@supabase/supabase-js");

/**
 * api/report.js (FINAL)
 * - Fetch attempt row from Supabase
 * - Re-grade on the server using stored answers (attempt.answers)
 * - Supports section 1-4 and full (40 questions)
 * - Uses SAME normalization + word-limit logic as questions.js
 *
 * ✅ Added (minimal changes):
 *  1) overall.band + bandTable
 *  2) sectionsEnhanced (accuracy / topErrorLabels placeholder / note)
 */

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
    // ✅ 新增：给前端可渲染 band 表
    bandTable: [],
    // ✅ 新增：给前端未来模块3用
    sectionsEnhanced: [],
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
  try {
    return JSON.parse(v);
  } catch {
    return null;
  }
}

/* =========================
   SAME AS questions.js
========================== */

function normalizeAnswer(text) {
  let s = (text ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[$£,]/g, "")
    .replace(/(\d+)(st|nd|rd|th)\b/g, "$1");

  // 统一时间写法：8.30 -> 8:30
  s = s.replace(/\b(\d{1,2})\.(\d{2})\b/g, "$1:$2");

  // 去掉分隔符两侧空格： "7 / 14" -> "7/14", "14 - 7" -> "14-7"
  s = s.replace(/\s*([\/:.-])\s*/g, "$1");

  // 合并空格 + 去掉首尾标点
  s = s
    .replace(/\s+/g, " ")
    .replace(/^[\s.,"'!?;:()[\]{}<>]+|[\s.,"'!?;:()[\]{}<>]+$/g, "");

  return s;
}

function wordCount(text) {
  const t = normalizeAnswer(text);
  if (!t) return 0;
  return t.split(" ").filter(Boolean).length;
}

function isCorrectAnswer(userInput, acceptedAnswers, maxWords, mcqOptions) {
  const user = normalizeAnswer(userInput);
  if (!user) return false;

  if (typeof maxWords === "number" && maxWords > 0) {
    if (wordCount(userInput) > maxWords) return false;
  }

  const list = Array.isArray(acceptedAnswers) ? acceptedAnswers.slice() : [];

  // 如果 key 是 a/b/c 且有 options，则允许匹配对应的选项文本
  if (
    list.length === 1 &&
    /^[abc]$/.test(normalizeAnswer(list[0])) &&
    Array.isArray(mcqOptions)
  ) {
    const letter = normalizeAnswer(list[0]);
    const idx = letter === "a" ? 0 : letter === "b" ? 1 : 2;
    const opt = mcqOptions[idx];
    if (opt) list.push(opt);
  }

  return list.some((ans) => normalizeAnswer(ans) === user);
}

/* =========================
   NEW: Band table + band calc
   (Listening raw->band mapping)
========================== */

// ✅ 你后续如果要微调映射，只改这一张表即可
const BAND_TABLE = [
  { rawMin: 39, rawMax: 40, band: 9.0, rawLabel: "39–40" },
  { rawMin: 37, rawMax: 38, band: 8.5, rawLabel: "37–38" },
  { rawMin: 35, rawMax: 36, band: 8.0, rawLabel: "35–36" },
  { rawMin: 32, rawMax: 34, band: 7.5, rawLabel: "32–34" },
  { rawMin: 30, rawMax: 31, band: 7.0, rawLabel: "30–31" },
  { rawMin: 26, rawMax: 29, band: 6.5, rawLabel: "26–29" },
  { rawMin: 23, rawMax: 25, band: 6.0, rawLabel: "23–25" },
  { rawMin: 18, rawMax: 22, band: 5.5, rawLabel: "18–22" },
  { rawMin: 16, rawMax: 17, band: 5.0, rawLabel: "16–17" },
  { rawMin: 13, rawMax: 15, band: 4.5, rawLabel: "13–15" },
  { rawMin: 10, rawMax: 12, band: 4.0, rawLabel: "10–12" },
  { rawMin: 8, rawMax: 9, band: 3.5, rawLabel: "8–9" },
  { rawMin: 6, rawMax: 7, band: 3.0, rawLabel: "6–7" },
  { rawMin: 4, rawMax: 5, band: 2.5, rawLabel: "4–5" },
  { rawMin: 2, rawMax: 3, band: 2.0, rawLabel: "2–3" },
  { rawMin: 0, rawMax: 1, band: 1.0, rawLabel: "0–1" },
];

// 返回 band（找不到则给 0）
function calcListeningBand(rawCorrect) {
  const n = Number(rawCorrect ?? 0);
  const row = BAND_TABLE.find((r) => n >= r.rawMin && n <= r.rawMax);
  return row ? row.band : 0;
}

// 给前端渲染的表格（不带 rawMin/rawMax 也行，你按你喜好）
function bandTableForClient() {
  return BAND_TABLE.map((r) => ({ raw: r.rawLabel, band: r.band }));
}

/* =========================
   Answer Key (LOCKED)
   ⚠️ 不改题目/答案，只做后端一致判分
========================== */

const MCQ_OPTIONS = {
  7: ["Adventure Camp", "Explorer Camp", "Science Camp"],
  8: ["One week", "Two weeks", "Three weeks"],
  9: ["By credit card", "By bank transfer", "In cash"],
  10: ["A confirmation letter", "A payment receipt", "An email containing bank details"],
  17: ["Accommodation help", "Language support", "IT assistance"],
  18: ["Meet in the cafeteria", "Relax on the lawn", "Visit the student centre"],
  19: ["Email the guide", "Go to the info desk", "Ask another student volunteer"],
  20: ["The campus map", "Upcoming events", "Course registration dates"],
  21: ["It is too broad", "It lacks sufficient data", "It overlaps with another group’s project"],
  22: ["Organising group meetings", "Collecting survey responses", "Analysing academic sources"],
  23: ["The current method is too time-consuming", "The tutor recommends a different approach", "Previous studies used a similar method"],
};

const ANSWERS = {
  1: ["ethan park"],
  2: ["9", "nine"],
  3: [
    "july 14th",
    "july 14",
    "14 july",
    "14th july",
    "7/14",
    "07/14",
    "14/7",
    "14/07",
    "7-14",
    "07-14",
    "14-7",
    "14-07",
  ],
  4: ["480", "$480"],
  5: ["60", "$60"],
  6: ["peanut"],
  7: ["explorer camp"],
  8: ["two weeks"],
  9: ["by bank transfer"],
  10: ["an email containing bank details"],
  11: ["e"],
  12: ["c"],
  13: ["b"],
  14: ["f"],
  15: ["8:30", "8.30", "eight-thirty"],
  16: ["id", "identification"],
  17: ["b"],
  18: ["b"],
  19: ["b"],
  20: ["b"],
  21: ["a"],
  22: ["c"],
  23: ["a"],
  24: ["c"],
  25: ["b"],
  26: ["d"],
  27: ["3000"],
  28: ["friday"],
  29: ["five", "5"],
  30: ["ten", "10"],
  31: ["carbon"],
  32: ["efficient"],
  33: ["wind"],
  34: ["gardens"],
  35: ["sprawl"],
  36: ["consumption"],
  37: ["composting"],
  38: ["cycling"],
  39: ["flow"],
  40: ["communities"],
};

const MAX_WORDS = {
  1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2,
  15: 1, 16: 1,
  27: 1, 28: 1, 29: 1, 30: 1,
  31: 1, 32: 1, 33: 1, 34: 1, 35: 1,
  36: 1, 37: 1, 38: 1, 39: 1, 40: 1,
};

function expandAcceptedAnswers(qNum) {
  const base = Array.isArray(ANSWERS[qNum]) ? [...ANSWERS[qNum]] : [];

  if (base.length === 1 && /^[abc]$/i.test(base[0]) && Array.isArray(MCQ_OPTIONS[qNum])) {
    const letter = normalizeAnswer(base[0]);
    const idx = letter === "a" ? 0 : letter === "b" ? 1 : 2;
    const opt = MCQ_OPTIONS[qNum][idx];
    if (opt) base.push(opt);
  }

  return base;
}

function scoreQuestions(questionNumbers, answersObj) {
  let correct = 0;

  for (const qNum of questionNumbers) {
    const userRaw = answersObj?.[String(qNum)] ?? answersObj?.[qNum] ?? "";

    const accepted = expandAcceptedAnswers(qNum);
    const maxWords = MAX_WORDS[qNum];
    const mcqOptions = MCQ_OPTIONS[qNum];

    if (isCorrectAnswer(userRaw, accepted, maxWords, mcqOptions)) correct += 1;
  }

  return { rawCorrect: correct, rawTotal: questionNumbers.length };
}

function getQuestionNumbersBySection(section) {
  if (section === "1") return Array.from({ length: 10 }, (_, i) => i + 1);
  if (section === "2") return Array.from({ length: 10 }, (_, i) => i + 11);
  if (section === "3") return Array.from({ length: 10 }, (_, i) => i + 21);
  if (section === "4") return Array.from({ length: 10 }, (_, i) => i + 31);
  if (section === "full") return Array.from({ length: 40 }, (_, i) => i + 1);
  return [];
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

    const section = String(attempt.section || "").trim() || "full";
    const answersObj = safeObj(attempt.answers) || {};

    let overall = { rawCorrect: 0, rawTotal: 0 };
    let sections = [];

    if (section === "full") {
      const s1 = scoreQuestions(getQuestionNumbersBySection("1"), answersObj);
      const s2 = scoreQuestions(getQuestionNumbersBySection("2"), answersObj);
      const s3 = scoreQuestions(getQuestionNumbersBySection("3"), answersObj);
      const s4 = scoreQuestions(getQuestionNumbersBySection("4"), answersObj);

      overall = {
        rawCorrect: s1.rawCorrect + s2.rawCorrect + s3.rawCorrect + s4.rawCorrect,
        rawTotal: 40,
      };

      sections = [
        { section: "1", rawCorrect: s1.rawCorrect, rawTotal: s1.rawTotal },
        { section: "2", rawCorrect: s2.rawCorrect, rawTotal: s2.rawTotal },
        { section: "3", rawCorrect: s3.rawCorrect, rawTotal: s3.rawTotal },
        { section: "4", rawCorrect: s4.rawCorrect, rawTotal: s4.rawTotal },
      ];
    } else {
      const nums = getQuestionNumbersBySection(section);
      const s = scoreQuestions(nums, answersObj);
      overall = { rawCorrect: s.rawCorrect, rawTotal: s.rawTotal };
      sections = [{ section, rawCorrect: s.rawCorrect, rawTotal: s.rawTotal }];
    }

    // ✅ 新增：计算 band + 提供 bandTable
    const band = calcListeningBand(overall.rawCorrect);
    const bandTable = bandTableForClient();

    // ✅ 新增：sectionsEnhanced（占位字段，不影响现有功能）
    const sectionsEnhanced = sections.map((s) => {
      const acc = s.rawTotal ? Math.round((s.rawCorrect / s.rawTotal) * 100) : 0;
      return {
        section: String(s.section),
        rawCorrect: s.rawCorrect,
        rawTotal: s.rawTotal,
        accuracy: acc,          // 0-100
        topErrorLabels: [],     // 先占位：后续你再做错误标签Top3
        note: "",               // 先占位：后续你再补一句话总结
      };
    });

    const headline =
      section === "full"
        ? `已生成真实报告：Full Test 判分 ${overall.rawCorrect}/40（后端复算）`
        : `已生成真实报告：Section ${section} 判分 ${overall.rawCorrect}/${overall.rawTotal}（后端复算）`;

    return res.status(200).json({
      version: "scoreResponse.v1",
      attemptId,
      overall: {
        rawCorrect: overall.rawCorrect,
        rawTotal: overall.rawTotal,
        band, // ✅ 不再是 null
        cefr: "NA",
        timeSpentSec: 0,
        headlineCn: headline,
      },
      sections,
      // ✅ 新增字段：不破坏旧前端
      bandTable,
      sectionsEnhanced,

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
