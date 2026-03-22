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

function includesDigitLike(value) {
  return /\d/.test(String(value ?? ""));
}

function includesTimeLike(value) {
  return /(\d{1,2}[:.]\d{2})|(half past)|(quarter past)|(quarter to)/i.test(String(value ?? ""));
}

function includesDateLike(value) {
  return /(january|february|march|april|may|june|july|august|september|october|november|december|\d{1,2}[\/-]\d{1,2}|\d{1,2}(st|nd|rd|th))/i.test(String(value ?? ""));
}

function anyAcceptedLooksNumeric(acceptedAnswers = []) {
  return acceptedAnswers.some((ans) => includesDigitLike(ans) || includesTimeLike(ans));
}

function anyAcceptedLooksDate(acceptedAnswers = []) {
  return acceptedAnswers.some((ans) => includesDateLike(ans));
}

function hasParaphraseHints(item) {
  const map = item?.paraphraseMap || {};
  return Object.keys(map).length > 0;
}

function normalizedList(arr) {
  return (Array.isArray(arr) ? arr : []).map((x) => normalizeText(x));
}

/* ---------------------------
 * 自动判因核心
 * --------------------------- */

function detectPrimaryError(item, userAnswer) {
  const acceptedAnswers = Array.isArray(item.acceptedAnswers) ? item.acceptedAnswers : [];
  const formatPolicy = item.formatPolicy || {};
  const questionType = String(item.questionType || "");
  const section = Number(item.section || 0);
  const userRaw = String(userAnswer ?? "").trim();
  const userNorm = normalizeText(userRaw);
  const distractorsNorm = normalizedList(item.distractors || []);

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

  /* 1. 规则 / 格式类优先 */
  if (formatPolicy.numberSensitive || anyAcceptedLooksNumeric(acceptedAnswers)) {
    if (includesDigitLike(userRaw) || includesTimeLike(userRaw) || userNorm) {
      return {
        primaryError: "A4",
        secondaryErrors: ["I4"],
        reason: "number_time_format_or_value_issue"
      };
    }
  }

  if (formatPolicy.dateSensitive || anyAcceptedLooksDate(acceptedAnswers)) {
    return {
      primaryError: "A4",
      secondaryErrors: ["I4"],
      reason: "date_format_or_value_issue"
    };
  }

  if (formatPolicy.requiresExactSpelling && isNearSpelling(userRaw, acceptedAnswers)) {
    return {
      primaryError: "A2",
      secondaryErrors: ["I3"],
      reason: "spelling_close_but_wrong"
    };
  }

  /* 2. 题型优先规则 */
  if (questionType === "map_labeling") {
    return {
      primaryError: "G3",
      secondaryErrors: ["C1", "E1"],
      reason: "map_or_spatial_location_miss"
    };
  }

  if (questionType === "matching") {
    return {
      primaryError: "J2",
      secondaryErrors: ["C3", "H4"],
      reason: "matching_pairing_or_sequence_miss"
    };
  }

  /* 3. 选择题更细分 */
  if (questionType === "single_choice") {
    const userIsDistractor = distractorsNorm.includes(userNorm);

    if (section === 3) {
      if (userIsDistractor) {
        return {
          primaryError: "H3",
          secondaryErrors: ["E1", "B1"],
          reason: "multi_speaker_tracking_and_distractor_trap"
        };
      }
      return {
        primaryError: "E1",
        secondaryErrors: ["H3", "B1"],
        reason: "section3_choice_wrong_likely_discussion_trap"
      };
    }

    if (userIsDistractor) {
      return {
        primaryError: "E1",
        secondaryErrors: ["B1"],
        reason: "selected_known_distractor"
      };
    }

    if (hasParaphraseHints(item)) {
      return {
        primaryError: "B1",
        secondaryErrors: ["E1", "C2"],
        reason: "choice_wrong_likely_paraphrase_miss"
      };
    }

    return {
      primaryError: "E1",
      secondaryErrors: ["B1"],
      reason: "choice_question_wrong_option"
    };
  }

  /* 4. 填空题更细分 */
  if (questionType === "form_completion") {
    if (section === 1) {
      return {
        primaryError: "C1",
        secondaryErrors: ["B1", "A4"],
        reason: "section1_form_wrong_likely_location_or_detail_capture_issue"
      };
    }
    return {
      primaryError: "C1",
      secondaryErrors: ["B1"],
      reason: "form_completion_wrong_content"
    };
  }

  if (questionType === "sentence_completion") {
    if (hasParaphraseHints(item)) {
      return {
        primaryError: "B1",
        secondaryErrors: ["C1", "A4"],
        reason: "sentence_completion_likely_paraphrase_miss"
      };
    }
    return {
      primaryError: "C1",
      secondaryErrors: ["B1"],
      reason: "sentence_completion_wrong_window"
    };
  }

  if (questionType === "note_completion") {
    if (section === 4) {
      if (isNearSpelling(userRaw, acceptedAnswers)) {
        return {
          primaryError: "A2",
          secondaryErrors: ["F3", "B1"],
          reason: "section4_note_spelling_close"
        };
      }

      if (hasParaphraseHints(item)) {
        return {
          primaryError: "F3",
          secondaryErrors: ["B1", "A2"],
          reason: "section4_lecture_structure_or_paraphrase_miss"
        };
      }

      return {
        primaryError: "F3",
        secondaryErrors: ["B1"],
        reason: "section4_note_completion_likely_lecture_structure_miss"
      };
    }

    if (section === 3) {
      if (hasParaphraseHints(item)) {
        return {
          primaryError: "B1",
          secondaryErrors: ["H3", "C1"],
          reason: "section3_note_likely_paraphrase_or_tracking_miss"
        };
      }

      return {
        primaryError: "H3",
        secondaryErrors: ["C1", "B1"],
        reason: "section3_note_completion_likely_multi_speaker_tracking_issue"
      };
    }

    return {
      primaryError: "C1",
      secondaryErrors: ["B1", "A2"],
      reason: "note_completion_wrong_answer_window"
    };
  }

  /* 5. metadata 候选回退 */
  const candidateErrors = Array.isArray(item.candidateErrors) ? item.candidateErrors : [];
  return {
    primaryError: candidateErrors[0] || "K1",
    secondaryErrors: candidateErrors.slice(1, 3),
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

  if (userAnswersMap[qid] != null) return userAnswersMap[qid];

  if (userAnswersMap[qNum] != null) return userAnswersMap[qNum];
  if (userAnswersMap[qNumStr] != null) return userAnswersMap[qNumStr];
  if (userAnswersMap[qKeyLower] != null) return userAnswersMap[qKeyLower];
  if (userAnswersMap[qKeyUpper] != null) return userAnswersMap[qKeyUpper];

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
      signalWordType: item.signalWordType || null,
      speakerTracking: item.speakerTracking || null
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

function getWeakDimensions(profile) {
  return Object.entries(profile || {})
    .filter(([, v]) => Number(v.total || 0) > 0)
    .sort((a, b) => Number(a[1].score || 0) - Number(b[1].score || 0))
    .slice(0, 4)
    .map(([dim, v]) => ({
      dim,
      score: Number(v.score || 0),
      total: Number(v.total || 0)
    }));
}

function getSectionErrorProfile(results) {
  const map = {
    1: { totalWrong: 0, labels: {} },
    2: { totalWrong: 0, labels: {} },
    3: { totalWrong: 0, labels: {} },
    4: { totalWrong: 0, labels: {} }
  };

  (Array.isArray(results) ? results : []).forEach((item) => {
    const sec = Number(item.section || 0);
    if (!map[sec]) return;
    if (item.isCorrect) return;

    map[sec].totalWrong += 1;
    const label = item.primaryError || "K1";
    map[sec].labels[label] = (map[sec].labels[label] || 0) + 1;
  });

  return map;
}

function buildFreeReport(overall, sections, topErrors, profile, itemDiagnostics) {
  const band = Number(overall?.band || 0);
  const weakDims = getWeakDimensions(profile);
  const weakestDim = weakDims[0]?.dim || "";
  const secondWeakDim = weakDims[1]?.dim || "";

  const topErrorLabels = (Array.isArray(topErrors) ? topErrors : []).map((x) => x.label);
  const weakestSection = [...(sections || [])].sort((a, b) => a.rawCorrect - b.rawCorrect)[0];
  const priorityOrder = [...(sections || [])]
    .sort((a, b) => a.rawCorrect - b.rawCorrect)
    .map((s) => `Section ${s.section}`);

  const sectionErrorProfile = getSectionErrorProfile(itemDiagnostics);
  const weakSec = Number(weakestSection?.section || 1);
  const weakSecLabels = Object.entries(sectionErrorProfile[weakSec]?.labels || {})
    .sort((a, b) => b[1] - a[1])
    .map(([label]) => label);

  let summary = "";
  let todayAction = "";

  if (band >= 7) {
    if (topErrorLabels.includes("E1") || weakestDim === "D9") {
      summary =
        "你的整体理解能力已经在线，当前最影响继续提分的不是基础听不懂，而是选择题和讨论题里的干扰项处理稳定性。你能抓到大意，但在“先提及、后修正、非最终结论”这类位置上还会被带偏。";
      todayAction =
        "今天先做 1 组选择题或 Section 3，做完后每题写 3 个点：谁先说了什么、后来怎么被修正、最终答案为什么不是你原来选的。";
    } else if (topErrorLabels.includes("B1") || weakestDim === "D2") {
      summary =
        "你现在更像是卡在“替换识别精度”上：并不是完全没听到，而是题干和录音换了说法后，你没有足够快地认出它们本质上是同一个意思。这会让你在 7 分以上阶段反复丢不该丢的分。";
      todayAction =
        "今天先做 8–10 题错题复盘，只做一件事：把题干关键词和录音里的替换表达一一配对写出来。";
    } else if (topErrorLabels.includes("F3") || weakestDim === "D6" || weakestDim === "D10") {
      summary =
        "你当前更像是高分段常见的“讲座结构稳定性”问题：细节并不是完全听不到，但在讲座推进、结构层级和答案窗口把握上还不够稳，所以会出现成组失分。";
      todayAction =
        "今天先做 1 组 Section 4，不急着重做整套，只复盘结构：开头主题、转折词、例子和最终结论分别在哪里。";
    } else {
      summary =
        "你已经具备较强的整体听力能力，当前更关键的是把表现从“大多数时候做对”提升到“稳定做对”。这说明你现在的核心任务不是继续堆量，而是修正最容易反复出现的高阶失误。";
      todayAction =
        `今天先从 ${priorityOrder[0] || "失分最多的 Section"} 开始，做 1 组精复盘：每道错题都写下“我到底是没听到，没认出替换，还是被干扰项带偏”。`;
    }
  } else if (band >= 5.5) {
    if (topErrorLabels.includes("B1") && topErrorLabels.includes("C1")) {
      summary =
        "你当前不是完全听不懂，而是“有理解，但不够稳”。更明显的问题出在定位和替换识别衔接不上：有时你听到了相关信息，但没有及时确认它就是答案，或者答案窗口已经过去。";
      todayAction =
        "今天先做 1 组 Section 2 或 Section 3，做完后每题写下：题干关键词、录音替换表达、答案真正出现在哪一句。";
    } else if (topErrorLabels.includes("A4") || weakestDim === "D4") {
      summary =
        "你当前有一定理解基础，但基础执行分还没有稳住，尤其是数字、日期、时间或拼写类细节会持续拉低总分。这类分数如果先稳住，整体 Band 会比继续盲刷更容易上去。";
      todayAction =
        "今天先练 10 分钟基础执行：数字 / 日期 / 时间 / 拼写快写，只练“听到后立刻写对”。";
    } else if (topErrorLabels.includes("E1") || topErrorLabels.includes("H3")) {
      summary =
        "你当前的一个明显短板在于讨论题中的干扰项判断。你能听懂部分内容，但在多人对话、意见变化和最终结论判断上容易被带偏，所以成绩波动会比较大。";
      todayAction =
        "今天先做 1 组 Section 3，做完后逐题写：谁说了决定性信息、你误选的内容为什么只是干扰。";
    } else {
      summary =
        "你目前处在“可以继续提，但稳定性不足”的阶段。真正拉开你和更高分段差距的，不只是听力理解本身，而是不同题型下的执行精度和稳定度。";
      todayAction =
        `今天先从 ${priorityOrder[0] || "失分最多的 Section"} 开始，只做这一组，并把错题按“定位/替换/干扰项/执行细节”分成 4 类。`;
    }
  } else if (band >= 4) {
    if (topErrorLabels.includes("A4") || weakestDim === "D4") {
      summary =
        "你当前最优先的不是做更多题，而是先把基础拿分区稳定下来。现在更明显的问题出在数字、拼写、日期和落笔执行上，这些本来应该拿住的分数正在持续流失。";
      todayAction =
        "今天先做 8 分钟数字 / 日期 / 拼写快写，再做 5 题 Section 1，目标不是做多，而是每题都写对。";
    } else if (topErrorLabels.includes("C1") || weakSec === 2) {
      summary =
        "你当前更需要先修复信息定位能力。现在不是单纯词汇不够，而是你常常没能在正确的答案窗口里把信息抓住，所以会出现“听过但没拿到分”的情况。";
      todayAction =
        "今天先做 1 组 Section 2 或 Section 1，做完后在每道错题旁边标出答案真正出现的那一句。";
    } else {
      summary =
        "你现在最需要建立的是稳定的基础拿分能力。与其继续刷很多题，不如先把最常见、最容易修复的失分点一个个拿住。";
      todayAction =
        `今天先从 ${priorityOrder[0] || "基础 section"} 开始，只做 10 分钟，重点找出你最常见的 1 种错误。`;
    }
  } else {
    summary =
      "你当前最优先的任务不是冲难题，而是先建立基础题型的生存能力。现在的失分说明你在基础信息捕捉、定位和细节执行上还不够稳，先把 Section 1 / 2 的基本分拿住，后面提升会更快。";
    todayAction =
      "今天先只做 Section 1 的基础填空，不做整套。每题只练 1 件事：听到关键词后，能不能立刻把答案准确写下来。";
  }

  let extraHint = "";
  if (weakestDim === "D2") {
    extraHint = " 当前最弱点更偏向替换识别。";
  } else if (weakestDim === "D3") {
    extraHint = " 当前最弱点更偏向答案定位。";
  } else if (weakestDim === "D4") {
    extraHint = " 当前最弱点更偏向数字/拼写/格式执行。";
  } else if (weakestDim === "D9") {
    extraHint = " 当前最弱点更偏向干扰项抗性。";
  } else if (weakestDim === "D10") {
    extraHint = " 当前最弱点更偏向信号词与结构推进判断。";
  } else if (weakestDim === "D12") {
    extraHint = " 当前最弱点更偏向记笔记 / 工作记忆负荷。";
  }

  if (weakSecLabels.includes("K1") && band >= 5.5) {
    extraHint += " 同时你还存在一部分本可避免的空题/漏题。";
  }

  summary += extraHint;

  return {
    summary,
    priorityOrder,
    todayAction,
    weakDimensions: [weakestDim, secondWeakDim].filter(Boolean)
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
  const freeReport = buildFreeReport(
    { rawCorrect, rawTotal, band, cefr },
    sections,
    topErrors,
    profile,
    results
  );
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
