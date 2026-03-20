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

function buildFreeReport(results, sections) {
  const weakestSection = [...sections].sort((a, b) => a.rawCorrect - b.rawCorrect)[0];
  const priorityOrder = [...sections]
    .sort((a, b) => a.rawCorrect - b.rawCorrect)
    .map((s) => `Section ${s.section}`);

  let summary = "";
  let todayAction = "";

  if (weakestSection.section === 1) {
    summary = "你当前的失分首先集中在基础拿分区，说明问题更可能出在拼写、数字细节、信息定位和落笔执行稳定性上，而不只是“听不懂”。";
    todayAction = "今天先练 10 分钟 Section 1：只做数字、日期、姓名拼写，练“听到后立刻写对”。";
  } else if (weakestSection.section === 2) {
    summary = "你当前更需要优先修复地图/场景说明类题型的定位与替换识别，这通常意味着你听到了部分信息，但没有稳定抓住真正答案窗口。";
    todayAction = "今天先做 1 组 Section 2，做完后把每题的题干关键词和录音里的替换表达各写一遍。";
  } else if (weakestSection.section === 3) {
    summary = "你当前的主要短板更接近多人对话中的信息跟踪和干扰项处理，也就是说，问题不只是理解，而是容易在说话人切换和修正信息中被带偏。";
    todayAction = "今天先做 1 组 Section 3，做完后逐题写下：是谁说的、最后结论是什么。";
  } else {
    summary = "你当前在长段讲座中的稳定性最需要加强，说明你可能能听到局部细节，但在结构信号词、层级关系和持续注意上还不够稳。";
    todayAction = "今天先做 1 组 Section 4，做完只复盘 2 件事：转折词在哪里、答案是在主旨句还是细节句。";
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

function buildReportPayload(metadata, diagnosisResults, attemptId = "mock_attempt") {
  const results = Array.isArray(diagnosisResults) ? diagnosisResults : [];
  const rawCorrect = results.filter((x) => x.isCorrect).length;
  const rawTotal = results.length;
  const band = getBandFromRaw(rawCorrect);
  const cefr = bandToCEFRForReport(band);

  const sections = getSectionBuckets(results);
  const profile = aggregateProfile(results, metadata);
  const topErrors = aggregateTopErrors(results);
  const freeReport = buildFreeReport(results, sections);
  const premiumPreview = buildPremiumPreview(profile, topErrors);

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
    premiumPreview
  };
}
