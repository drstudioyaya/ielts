const fs = require("fs");
const path = require("path");

/* ---------------------------
 * 基础工具
 * --------------------------- */

function normalizeText(value) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/[.,]/g, "")
    .replace(/\b(the|a|an)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshtein(a, b) {
  const s = String(a);
  const t = String(b);
  const m = s.length;
  const n = t.length;

  if (m === 0) return n;
  if (n === 0) return m;

  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }

  return dp[m][n];
}

function matchesAcceptedAnswer(userAnswer, acceptedAnswers = []) {
  const userNorm = normalizeText(userAnswer);
  return acceptedAnswers.some((ans) => normalizeText(ans) === userNorm);
}

function isNearSpelling(userAnswer, acceptedAnswers = []) {
  const userNorm = normalizeText(userAnswer);
  if (!userNorm) return false;

  return acceptedAnswers.some((ans) => {
    const ansNorm = normalizeText(ans);
    if (!ansNorm) return false;
    const dist = levenshtein(userNorm, ansNorm);
    return dist > 0 && dist <= 2;
  });
}

/* ---------------------------
 * 自动判因
 * --------------------------- */

function detectPrimaryError(item, userAnswer) {
  const acceptedAnswers = Array.isArray(item.acceptedAnswers) ? item.acceptedAnswers : [];
  const formatPolicy = item.formatPolicy || {};
  const userRaw = String(userAnswer ?? "").trim();

  if (!userRaw) {
    return {
      primaryError: "K1",
      secondaryErrors: [],
      reason: "empty_answer"
    };
  }

  if (matchesAcceptedAnswer(userRaw, acceptedAnswers)) {
    return {
      primaryError: null,
      secondaryErrors: [],
      reason: "correct"
    };
  }

  if (formatPolicy.numberSensitive) {
    return {
      primaryError: "A4",
      secondaryErrors: ["I4"],
      reason: "number_or_numeric_format_issue"
    };
  }

  if (formatPolicy.dateSensitive) {
    return {
      primaryError: "A4",
      secondaryErrors: ["I4"],
      reason: "date_format_issue"
    };
  }

  if (formatPolicy.requiresExactSpelling && isNearSpelling(userRaw, acceptedAnswers)) {
    return {
      primaryError: "A2",
      secondaryErrors: ["I3"],
      reason: "spelling_close_but_wrong"
    };
  }

  if (item.questionType === "single_choice") {
    return {
      primaryError: "E1",
      secondaryErrors: ["B1"],
      reason: "choice_question_wrong_option"
    };
  }

  if (item.questionType === "form_completion") {
    return {
      primaryError: "C1",
      secondaryErrors: ["B1"],
      reason: "form_completion_wrong_content"
    };
  }

  return {
    primaryError: item.candidateErrors?.[0] || "K1",
    secondaryErrors: item.candidateErrors?.slice(1, 3) || [],
    reason: "fallback_candidate_error"
  };
}

function resolveUserAnswer(userAnswersMap, item) {
  if (!userAnswersMap || typeof userAnswersMap !== "object") return "";

  const qid = String(item.qid || "");
  const qNum = Number(item.questionNumber);
  const qNumStr = String(qNum);
  const qKeyLower = `q${qNum}`;
  const qKeyUpper = `Q${qNum}`;
  const sec = String(item.section || "");
  const secKey1 = `section${sec}`;
  const secKey2 = `Section${sec}`;

  // 1) 直接按 metadata qid
  if (userAnswersMap[qid] != null) return userAnswersMap[qid];

  // 2) 常见平铺 key：1 / "1" / q1 / Q1
  if (userAnswersMap[qNum] != null) return userAnswersMap[qNum];
  if (userAnswersMap[qNumStr] != null) return userAnswersMap[qNumStr];
  if (userAnswersMap[qKeyLower] != null) return userAnswersMap[qKeyLower];
  if (userAnswersMap[qKeyUpper] != null) return userAnswersMap[qKeyUpper];

  // 3) section 嵌套：section1[1] / section1["1"] / section1.q1 / section1.Q1
  const nested1 = userAnswersMap[secKey1];
  if (nested1 && typeof nested1 === "object") {
    if (nested1[qNum] != null) return nested1[qNum];
    if (nested1[qNumStr] != null) return nested1[qNumStr];
    if (nested1[qKeyLower] != null) return nested1[qKeyLower];
    if (nested1[qKeyUpper] != null) return nested1[qKeyUpper];
  }

  const nested2 = userAnswersMap[secKey2];
  if (nested2 && typeof nested2 === "object") {
    if (nested2[qNum] != null) return nested2[qNum];
    if (nested2[qNumStr] != null) return nested2[qNumStr];
    if (nested2[qKeyLower] != null) return nested2[qKeyLower];
    if (nested2[qKeyUpper] != null) return nested2[qKeyUpper];
  }

  // 4) 某些前端会包一层 answers
  const nestedAnswers = userAnswersMap.answers;
  if (nestedAnswers && typeof nestedAnswers === "object") {
    if (nestedAnswers[qid] != null) return nestedAnswers[qid];
    if (nestedAnswers[qNum] != null) return nestedAnswers[qNum];
    if (nestedAnswers[qNumStr] != null) return nestedAnswers[qNumStr];
    if (nestedAnswers[qKeyLower] != null) return nestedAnswers[qKeyLower];
    if (nestedAnswers[qKeyUpper] != null) return nestedAnswers[qKeyUpper];
  }

  return "";
}

function diagnoseOneItem(item, userAnswer) {
  const acceptedAnswers = Array.isArray(item.acceptedAnswers) ? item.acceptedAnswers : [];
  const isCorrect = matchesAcceptedAnswer(userAnswer, acceptedAnswers);
  const diagnosis = detectPrimaryError(item, userAnswer);

  return {
    qid: item.qid,
    section: item.section,
    questionNumber: item.questionNumber,
    questionType: item.questionType,
    userAnswer: String(userAnswer ?? ""),
    correctAnswer: item.answer,
    acceptedAnswers,
    isCorrect,
    primaryDimension: item.primaryDimension || null,
    candidateErrors: item.candidateErrors || [],
    primaryError: isCorrect ? null : diagnosis.primaryError,
    secondaryErrors: isCorrect ? [] : diagnosis.secondaryErrors,
    evidence: {
      cueWordsInQuestion: item.cueWordsInQuestion || [],
      paraphraseMap: item.paraphraseMap || {},
      distractors: item.distractors || [],
      signalWordType: item.signalWordType || null
    },
    debugReason: diagnosis.reason
  };
}

function diagnoseAttempt(metadata, userAnswersMap) {
  if (!Array.isArray(metadata)) {
    throw new Error("metadata must be an array");
  }

  return metadata.map((item) => {
    const userAnswer = resolveUserAnswer(userAnswersMap, item);
    return diagnoseOneItem(item, userAnswer);
  });
}

/* ---------------------------
 * 聚合报告
 * --------------------------- */

function getBandFromRaw(rawCorrect) {
  const raw = Number(rawCorrect || 0);

  if (raw >= 39) return 9.0;
  if (raw >= 37) return 8.5;
  if (raw >= 35) return 8.0;
  if (raw >= 32) return 7.5;
  if (raw >= 30) return 7.0;
  if (raw >= 26) return 6.5;
  if (raw >= 23) return 6.0;
  if (raw >= 18) return 5.5;
  if (raw >= 16) return 5.0;
  if (raw >= 13) return 4.5;
  if (raw >= 10) return 4.0;
  if (raw >= 8) return 3.5;
  if (raw >= 6) return 3.0;
  if (raw >= 4) return 2.5;
  return 2.0;
}

function bandToCEFRForReport(band) {
  const b = Number(band);
  if (!Number.isFinite(b)) return "NA";
  if (b < 3.0) return "A1";
  if (b < 4.0) return "A2";
  if (b < 5.5) return "B1";
  if (b < 7.0) return "B2";
  if (b < 8.5) return "C1";
  return "C2";
}

function buildEmptyProfile() {
  return {
    D1: { correct: 0, total: 0, score: 0 },
    D2: { correct: 0, total: 0, score: 0 },
    D3: { correct: 0, total: 0, score: 0 },
    D4: { correct: 0, total: 0, score: 0 },
    D5: { correct: 0, total: 0, score: 0 },
    D6: { correct: 0, total: 0, score: 0 },
    D7: { correct: 0, total: 0, score: 0 },
    D8: { correct: 0, total: 0, score: 0 },
    D9: { correct: 0, total: 0, score: 0 },
    D10: { correct: 0, total: 0, score: 0 },
    D11: { correct: 0, total: 0, score: 0 },
    D12: { correct: 0, total: 0, score: 0 }
  };
}

function pct(correct, total) {
  const t = Number(total || 0);
  if (!t) return 0;
  return Math.round((Number(correct || 0) / t) * 100);
}

function getSectionBuckets(results) {
  const buckets = {
    1: { section: 1, rawCorrect: 0, rawTotal: 0 },
    2: { section: 2, rawCorrect: 0, rawTotal: 0 },
    3: { section: 3, rawCorrect: 0, rawTotal: 0 },
    4: { section: 4, rawCorrect: 0, rawTotal: 0 }
  };

  results.forEach((item) => {
    const sec = Number(item.section);
    if (!buckets[sec]) return;
    buckets[sec].rawTotal += 1;
    if (item.isCorrect) buckets[sec].rawCorrect += 1;
  });

  return Object.values(buckets);
}

function aggregateProfile(results, metadata) {
  const profile = buildEmptyProfile();
  const metadataMap = new Map(metadata.map((item) => [item.qid, item]));

  results.forEach((result) => {
    const itemMeta = metadataMap.get(result.qid);
    if (!itemMeta) return;

    const dims = Array.isArray(itemMeta.dimensions) ? itemMeta.dimensions : [];
    dims.forEach((dim) => {
      if (!profile[dim]) return;
      profile[dim].total += 1;
      if (result.isCorrect) profile[dim].correct += 1;
    });
  });

  Object.keys(profile).forEach((dim) => {
    profile[dim].score = pct(profile[dim].correct, profile[dim].total);
  });

  return profile;
}

function aggregateTopErrors(results) {
  const counter = {};

  results.forEach((item) => {
    if (!item.isCorrect && item.primaryError) {
      counter[item.primaryError] = (counter[item.primaryError] || 0) + 1;
    }
  });

  return Object.entries(counter)
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function buildFreeReport(sections) {
  const weakestSection = [...sections].sort((a, b) => a.rawCorrect - b.rawCorrect)[0];
  const priorityOrder = [...sections]
    .sort((a, b) => a.rawCorrect - b.rawCorrect)
    .map((s) => `Section ${s.section}`);

  let summary = "";
  let todayAction = "";

  if (!weakestSection) {
    summary = "暂无可用诊断数据。";
    todayAction = "请先提交完整答案。";
  } else if (weakestSection.section === 1) {
    summary = "你当前的失分首先集中在基础拿分区，说明问题更可能出在拼写、数字细节、信息定位和落笔执行稳定性上。";
    todayAction = "今天先练 10 分钟 Section 1：只做数字、日期、姓名拼写。";
  } else if (weakestSection.section === 2) {
    summary = "你当前更需要优先修复地图/场景说明类题型的定位与替换识别。";
    todayAction = "今天先做 1 组 Section 2，做完后把题干关键词和录音里的替换表达各写一遍。";
  } else if (weakestSection.section === 3) {
    summary = "你当前的主要短板更接近多人对话中的信息跟踪和干扰项处理。";
    todayAction = "今天先做 1 组 Section 3，做完后逐题写下：是谁说的、最后结论是什么。";
  } else {
    summary = "你当前在长段讲座中的稳定性最需要加强。";
    todayAction = "今天先做 1 组 Section 4，只复盘转折词和答案窗口。";
  }

  return {
    summary,
    priorityOrder,
    todayAction
  };
}

function buildPremiumPreview(profile, topErrors) {
  const topWeakDimensions = Object.entries(profile)
    .filter(([, v]) => v.total > 0)
    .sort((a, b) => a[1].score - b[1].score)
    .slice(0, 3)
    .map(([dim]) => dim);

  return {
    topWeakDimensions,
    topErrorLabels: topErrors.map((x) => x.label).slice(0, 3)
  };
}

function buildBandTable() {
  return [
    { raw: "39-40", band: "9.0" },
    { raw: "37-38", band: "8.5" },
    { raw: "35-36", band: "8.0" },
    { raw: "32-34", band: "7.5" },
    { raw: "30-31", band: "7.0" },
    { raw: "26-29", band: "6.5" },
    { raw: "23-25", band: "6.0" },
    { raw: "18-22", band: "5.5" },
    { raw: "16-17", band: "5.0" },
    { raw: "13-15", band: "4.5" },
    { raw: "10-12", band: "4.0" },
    { raw: "8-9", band: "3.5" },
    { raw: "6-7", band: "3.0" },
    { raw: "4-5", band: "2.5" },
    { raw: "0-3", band: "2.0" }
  ];
}

function buildReportPayload(metadata, diagnosisResults, attemptId = "mock_attempt") {
  const results = Array.isArray(diagnosisResults) ? diagnosisResults : [];
  const rawCorrect = results.filter((x) => x.isCorrect).length;
  const rawTotal = results.length;
  const band = getBandFromRaw(rawCorrect);
  const cefr = bandToCEFRForReport(band);

  const sections = getSectionBuckets(results);
  const profile = aggregateProfile(results, metadata);
  const topErrors = aggregateTopErrors(results);
  const freeReport = buildFreeReport(sections);
  const premiumPreview = buildPremiumPreview(profile, topErrors);
  const bandTable = buildBandTable();

  return {
    attemptId,
    overall: {
      rawCorrect,
      rawTotal,
      band,
      cefr
    },
    sections,
    profile,
    topErrors,
    itemDiagnostics: results,
    freeReport,
    premiumPreview,
    bandTable
  };
}

/* ---------------------------
 * 读取数据
 * --------------------------- */

function readMetadata() {
  const filePath = path.join(process.cwd(), "public", "questions", "premium", "test1", "test1_metadata.json");
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function readAnswersFromQuery(req) {
  const answersParam = req.query.answers;
  if (!answersParam) return null;

  try {
    return JSON.parse(answersParam);
  } catch {
    return null;
  }
}

async function readAnswersFromSupabaseByAttemptId(attemptId) {
  const SUPABASE_URL = (process.env.SUPABASE_URL || "").trim().replace(/\/$/, "");
  const SUPABASE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error("missing_supabase_env");
  }

  const url =
    `${SUPABASE_URL}/rest/v1/attempts` +
    `?select=id,answers,test_id,section` +
    `&id=eq.${encodeURIComponent(attemptId)}` +
    `&limit=1`;

  const r = await fetch(url, {
    method: "GET",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Accept: "application/json"
    }
  });

  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`supabase_select_failed:${r.status}:${text}`);
  }

  const rows = await r.json();
  const row = Array.isArray(rows) ? rows[0] : null;
  if (!row) {
    throw new Error("attempt_not_found");
  }

  return row.answers && typeof row.answers === "object" ? row.answers : {};
}

/* ---------------------------
 * handler
 * --------------------------- */

module.exports = async (req, res) => {
  try {
    const attemptId = String(req.query.attemptId || "test1_preview_attempt");
    const metadata = readMetadata();

    let userAnswersMap = readAnswersFromQuery(req);
    if (!userAnswersMap) {
      userAnswersMap = await readAnswersFromSupabaseByAttemptId(attemptId);
    }

    const diagnosisResults = diagnoseAttempt(metadata, userAnswersMap);
    const report = buildReportPayload(metadata, diagnosisResults, attemptId);

    return res.status(200).json(report);
  } catch (err) {
    return res.status(500).json({
      error: "report_test1_failed",
      message: String(err && err.message ? err.message : err)
    });
  }
};
