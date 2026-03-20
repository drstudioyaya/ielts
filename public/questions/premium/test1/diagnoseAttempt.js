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

function detectPrimaryError(item, userAnswer) {
  const acceptedAnswers = Array.isArray(item.acceptedAnswers) ? item.acceptedAnswers : [];
  const formatPolicy = item.formatPolicy || {};
  const userRaw = String(userAnswer ?? "").trim();
  const userNorm = normalizeText(userRaw);

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

  const results = metadata.map((item) => {
    const userAnswer = userAnswersMap?.[item.qid] ?? "";
    return diagnoseOneItem(item, userAnswer);
  });

  return results;
}
