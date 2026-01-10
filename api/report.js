const { createClient } = require("@supabase/supabase-js");

/**
 * api/report.js (FINAL)
 * - Fetch attempt row from Supabase
 * - Re-grade on the server using stored answers (attempt.answers)
 * - Supports section 1-4 and full (40 questions)
 * - Uses SAME normalization + word-limit logic as questions.js
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

/**
 * Normalize user input for IELTS-style marking
 * ✅ 与你 questions.js 保持一致：
 *  - 8.30 -> 8:30
 *  - 去掉分隔符两侧空格：7 / 14 -> 7/14, 14 - 7 -> 14-7
 *  - 保留 / : - . 作为日期/时间的一部分
 */
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

/**
 * Word count under IELTS-style limits.
 * - "8:30" / "7/14" / "14-7" count as ONE token
 */
function wordCount(text) {
  const t = normalizeAnswer(text);
  if (!t) return 0;
  return t.split(" ").filter(Boolean).length;
}

/**
 * Check if user's answer matches ANY accepted answer
 * - maxWords: if provided, answers exceeding it are marked wrong
 * - MCQ-letter key (a/b/c) + options -> accept option text too
 */
function isCorrectAnswer(userInput, acceptedAnswers, maxWords, mcqOptions) {
  const user = normalizeAnswer(userInput);
  if (!user) return false;

  if (typeof maxWords === "number" && maxWords > 0) {
    if (wordCount(userInput) > maxWords) return false;
  }

  const list = Array.isArray(acceptedAnswers) ? acceptedAnswers.slice() : [];

  // 如果 key 是 a/b/c 且有 options，则允许匹配对应的选项文本（与 questions.js 同逻辑）
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
   Answer Key (LOCKED)
   ⚠️ 不改题目/答案，只做后端一致判分
========================== */

// MCQ options (用于 a/b/c -> 选项文本映射)
const MCQ_OPTIONS = {
  // Section 1
  7: ["Adventure Camp", "Explorer Camp", "Science Camp"],
  8: ["One week", "Two weeks", "Three weeks"],
  9: ["By credit card", "By bank transfer", "In cash"],
  10: ["A confirmation letter", "A payment receipt", "An email containing bank details"],

  // Section 2
  17: ["Accommodation help", "Language support", "IT assistance"],
  18: ["Meet in the cafeteria", "Relax on the lawn", "Visit the student centre"],
  19: ["Email the guide", "Go to the info desk", "Ask another student volunteer"],
  20: ["The campus map", "Upcoming events", "Course registration dates"],

  // Section 3
  21: ["It is too broad", "It lacks sufficient data", "It overlaps with another group’s project"],
  22: ["Organising group meetings", "Collecting survey responses", "Analysing academic sources"],
  23: ["The current method is too time-consuming", "The tutor recommends a different approach", "Previous studies used a similar method"],
};

// Canonical answers
const ANSWERS = {
  // Section 1
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

  // Section 2
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

  // Section 3
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

  // Section 4
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

// ✅ 严格字数限制（对齐你 questions.js 的 limits）
// - S1 Q1-6: max 2
// - S2 Q15-16: max 1
// - S3 Q27-30: max 1
// - S4 Q31-40: max 1  （你已确认写 ONE WORD AND/OR A NUMBER）
const MAX_WORDS = {
  1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2,
  15: 1, 16: 1,
  27: 1, 28: 1, 29: 1, 30: 1,
  31: 1, 32: 1, 33: 1, 34: 1, 35: 1,
  36: 1, 37: 1, 38: 1, 39: 1, 40: 1,
};

function expandAcceptedAnswers(qNum) {
  const base = Array.isArray(ANSWERS[qNum]) ? [...ANSWERS[qNum]] : [];

  // a/b/c + options => 允许 option text
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
    const userRaw =
      answersObj?.[String(qNum)] ??
      answersObj?.[qNum] ??
      "";

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

    // Re-grade on server
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
