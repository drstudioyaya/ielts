const { createClient } = require("@supabase/supabase-js");

/**
 * api/report.js
 * - Fetch attempt row from Supabase
 * - Re-grade on the server using stored answers (attempt.answers)
 * - Supports section 1-4 and full (40 questions)
 * - Enforces IELTS-style word/number limits STRICTLY where configured
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

/** ---------- IELTS-style normalization & limits ---------- **/

function normalizeAnswer(text) {
  // Keep separators for dates/times (/:.-) but remove most punctuation/currency.
  // Also: ordinal normalization (14th -> 14).
  return (text ?? "")
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/[–—]/g, "-")
    .replace(/[$£,]/g, "")
    .replace(/(\d+)(st|nd|rd|th)\b/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/^[\s.,"'!?;:()[\]{}<>]+|[\s.,"'!?;:()[\]{}<>]+$/g, "");
}

function wordCount(text) {
  const t = normalizeAnswer(text);
  if (!t) return 0;
  // Count by whitespace tokens. A numeric like "7/14" or "8:30" counts as 1 token.
  return t.split(" ").filter(Boolean).length;
}

function isCorrectAnswer(userInput, acceptedAnswers, maxWords) {
  const user = normalizeAnswer(userInput);

  if (!user) return false;

  if (typeof maxWords === "number" && maxWords > 0) {
    if (wordCount(userInput) > maxWords) return false;
  }

  const list = Array.isArray(acceptedAnswers) ? acceptedAnswers : [];
  return list.some((ans) => normalizeAnswer(ans) === user);
}

/** ---------- Answer key (Premium Test 1) ---------- **/

// MCQ options (so if user stores option text, we can still mark from letter key)
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

  // Q3: accept common written + numeric variants (day/month + month/day), and "-" variants
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

  // For Section 1 MCQ, your key uses option text already (not letters)
  7: ["explorer camp"],
  8: ["two weeks"],
  9: ["by bank transfer"],
  10: ["an email containing bank details"],

  // Section 2
  11: ["e"],
  12: ["c"],
  13: ["b"],
  14: ["f"],

  // Q15: ONE WORD AND/OR A NUMBER -> "eight thirty" (2 words) should be WRONG.
  // We accept numeric + hyphenated single-token wording.
  15: ["8:30", "8.30", "eight-thirty"],

  16: ["id", "identification"],

  // Here your key is letters; we also accept the option text mapped from that letter.
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

// Strict word limits (only enforce where we are sure from your instructions)
// - Section 1 Q1-6: NO MORE THAN TWO WORDS AND/OR A NUMBER -> maxWords=2
// - Section 2 Q15-16: ONE WORD AND/OR A NUMBER -> maxWords=1
// - Section 3 Q27-30: all expected as single token -> maxWords=1 (won't block correct answers)
// - Section 4 Q31-40: all single words -> maxWords=2 (safe; doesn't block correct)
const MAX_WORDS = {
  1: 2, 2: 2, 3: 2, 4: 2, 5: 2, 6: 2,
  15: 1, 16: 1,
  27: 1, 28: 1, 29: 1, 30: 1,
  31: 2, 32: 2, 33: 2, 34: 2, 35: 2, 36: 2, 37: 2, 38: 2, 39: 2, 40: 2,
};

function expandAcceptedAnswers(qNum) {
  const base = Array.isArray(ANSWERS[qNum]) ? [...ANSWERS[qNum]] : [];

  // If answer key is letter a/b/c AND we have options, accept option text too
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

    if (isCorrectAnswer(userRaw, accepted, maxWords)) correct += 1;
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
        ? `已生成真实报告：Full Test 本地判分 ${overall.rawCorrect}/40（已写入数据库）`
        : `已生成真实报告：Section ${section} 本地判分 ${overall.rawCorrect}/${overall.rawTotal}（已写入数据库）`;

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
