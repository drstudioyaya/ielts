function bandToCEFR(band) {
  const b = Number(band);
  if (!Number.isFinite(b)) return "NA";
  if (b < 3.0) return "A1";
  if (b < 4.0) return "A2";
  if (b < 5.5) return "B1";
  if (b < 7.0) return "B2";
  if (b < 8.5) return "C1";
  return "C2";
}

(function () {
  const $ = (sel) => document.querySelector(sel);

  function getAttemptId() {
    const params = new URLSearchParams(location.search);
    return (params.get("attemptId") || "").trim();
  }

  function esc(s) {
    return String(s ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function pct(n, d) {
    const denom = Number(d || 0);
    if (!denom) return 0;
    return Math.max(0, Math.min(100, Math.round((Number(n || 0) / denom) * 100)));
  }

  function sectionLabel(section) {
    if (section === "full") return "Full Test（1–40）";
    return `Section ${section}`;
  }

  function safeArr(v) {
    return Array.isArray(v) ? v : [];
  }

  function guessSectionNote(secNum) {
    const map = {
      "1": "通常考：信息定位 + 拼写/数字。",
      "2": "通常考：地图/流程 + 同义替换。",
      "3": "通常考：多人对话 + 干扰项。",
      "4": "通常考：学术讲座 + 结构信号词。",
    };
    return map[String(secNum)] || "";
  }

  function bandFromOverall(overall) {
    const b = overall?.band;
    if (b === null || b === undefined || b === "") return "—";
    return String(b);
  }

  function renderError(message, raw) {
    const app = $("#app");
    app.className = "grid";
    app.innerHTML = `
      <div class="card" style="grid-column:1/-1;">
        <h2 class="danger">加载失败</h2>
        <div class="muted">${esc(message)}</div>
        ${raw ? `<details open><summary>调试信息</summary><pre>${esc(raw)}</pre></details>` : ""}
        <div class="hr"></div>
        <div class="row">
          <a class="btn" href="./full.html" style="text-decoration:none;">返回 Full Test</a>
          <button class="btn" id="retryBtn">重试</button>
        </div>
      </div>
    `;
    const retryBtn = $("#retryBtn");
    if (retryBtn) retryBtn.onclick = () => location.reload();
  }

  function getSectionScoreMap(sections) {
    const map = { "1": 0, "2": 0, "3": 0, "4": 0 };
    sections.forEach((s) => {
      const sec = String(s.section || "");
      if (["1", "2", "3", "4"].includes(sec)) {
        map[sec] = Number(s.rawCorrect ?? 0);
      }
    });
    return map;
  }

  function getPriorityOrder(scoreMap) {
    return Object.entries(scoreMap)
      .sort((a, b) => a[1] - b[1])
      .map(([sec]) => `Section ${sec}`)
      .join(" → ");
  }

  function buildFreeDiagnosticText(scoreMap, overallBand) {
    const s1 = Number(scoreMap["1"] || 0);
    const s2 = Number(scoreMap["2"] || 0);
    const s3 = Number(scoreMap["3"] || 0);
    const s4 = Number(scoreMap["4"] || 0);
    const weakestSec = Object.entries(scoreMap).sort((a, b) => a[1] - b[1])[0]?.[0] || "2";
    const band = Number(overallBand || 0);

    let summary = "";
    let action = "";

    if (s2 <= 3 && s3 <= 3) {
      summary =
        "你当前的主要失分不只是“没听到”，而是出现在场景切换、同义替换反应和多人对话干扰处理上。也就是说，你的问题更接近“定位不稳、容易被带偏”，而不是单纯词汇不够。";
      action =
        "今天先做 1 组 Section 2 或 Section 3，做完后把每道错题的题干关键词改写成 1 个同义表达，并写一句“我是被哪个干扰点带偏的”。";
    } else if (s1 <= 6) {
      summary =
        "你当前在基础拿分区仍有明显丢分，说明问题更可能出在信息定位、数字/拼写、以及听到答案后的落笔执行不够稳。先把本来应该稳定拿下的分数拿住，提分会更快。";
      action =
        "今天先练 8 分钟数字 / 日期 / 拼写快写，只练“听到后立刻写对”，不要做整套题。";
    } else if (s4 >= 7 && (s2 < s4 || s3 < s4)) {
      summary =
        "你的长篇讲座理解相对不差，说明你并不是完全听不懂。当前更拉分的是前半段题型中的场景适应、定位速度和干扰项筛选能力，也就是“会做，但不够稳”。";
      action =
        "今天先从失分最多的 Section 开始，做 1 组精听复盘：每道错题都写下“正确答案是怎么被换一种说法说出来的”。";
    } else if (band <= 4) {
      summary =
        "你当前最优先的不是做更多题，而是先建立稳定的基础拿分能力。现在的失分说明你在定位、场景词识别和基础细节执行上还不够稳，先把基础 section 做扎实，整体分数会更容易上来。";
      action =
        "今天先选失分最多的一个 Section，只做 10 分钟：听一句、停一句、找答案定位词，不求做多，只求每题知道自己为什么对或错。";
    } else {
      summary =
        "你的整体理解没有完全断层，但不同 Section 之间稳定性差异明显。当前更需要做的是把“偶尔能做对”变成“稳定做对”，尤其要先修复失分最集中的部分。";
      action =
        `今天先从 Section ${weakestSec} 开始，做 1 组题后立即复盘：写下你这组题最常见的 1 个错误原因。`;
    }

    return {
      summary,
      priority: getPriorityOrder(scoreMap),
      action,
    };
  }

  function getFreeTextFromApiOrFallback(data) {
    const apiFree = data?.freeReport;
    const sections = safeArr(data?.sections);
    const overall = data?.overall || {};

    if (apiFree && typeof apiFree.summary === "string" && apiFree.summary.trim()) {
      const priority = Array.isArray(apiFree.priorityOrder)
        ? apiFree.priorityOrder.join(" → ")
        : (apiFree.priorityOrder || "");

      return {
        summary: apiFree.summary || "",
        priority: priority || "",
        action: apiFree.todayAction || ""
      };
    }

    const scoreMap = getSectionScoreMap(sections);
    return buildFreeDiagnosticText(scoreMap, overall.band);
  }

  function getPremiumPreviewFromApi(data) {
    const premium = data?.premiumPreview || {};
    const dims = Array.isArray(premium.topWeakDimensions) ? premium.topWeakDimensions : [];
    const labels = Array.isArray(premium.topErrorLabels) ? premium.topErrorLabels : [];

    return {
      dimsText: dims.length ? dims.join(" / ") : "解锁后查看你的 Top3 薄弱维度",
      labelsText: labels.length ? labels.join(" / ") : "解锁后查看你最常见的失分模式"
    };
  }

  function getErrorLabelText(label) {
    const map = {
      A1: "关键词未听出",
      A2: "拼写接近但错误",
      A4: "数字/日期/拼写失准",
      B1: "同义替换未识别",
      C1: "定位偏早/偏错",
      C2: "定位偏晚",
      C3: "题目顺序跟丢/串位",
      E1: "被干扰项带偏",
      E2: "比较/排除没跟上",
      E3: "修正信息未跟上",
      F1: "信号词不敏感",
      F3: "长讲座结构理解失误",
      G3: "地图/空间定位失误",
      H3: "多人对话跟踪吃力",
      H4: "工作记忆负荷过高",
      I2: "格式规则执行不稳",
      I3: "拼写/书写规则失误",
      I4: "数字日期格式规则失误",
      J2: "匹配题串位/配对失误",
      K1: "未作答/证据不足"
    };
    return map[label] || label || "—";
  }

  function getDimensionLabel(dim) {
    const map = {
      D1: "词汇捕捉力",
      D2: "同义替换识别力",
      D3: "信息定位能力",
      D4: "数字/日期/拼写精度",
      D5: "场景适应能力",
      D6: "长篇讲座理解力",
      D7: "预测能力",
      D8: "注意力持续度",
      D9: "干扰项抗性",
      D10: "语篇信号词敏感度",
      D11: "语音适应力",
      D12: "记笔记/工作记忆"
    };
    return map[dim] || dim;
  }

  function renderTopErrors(topErrors) {
    const items = safeArr(topErrors).slice(0, 5);
    if (!items.length) {
      return `<div class="muted">暂无高频错因数据。</div>`;
    }

    return items.map((item) => {
      const label = item?.label || "";
      const count = Number(item?.count || 0);
      return `
        <div class="sectionItem">
          <div class="sectionLeft">
            <div class="sectionTitle">${esc(label)}｜${esc(getErrorLabelText(label))}</div>
            <div class="sectionMeta">出现次数：${esc(count)}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderEvidenceSnapshot(itemDiagnostics) {
    const wrongItems = safeArr(itemDiagnostics)
      .filter((item) => !item.isCorrect)
      .slice(0, 5);

    if (!wrongItems.length) {
      return `<div class="muted">本次没有可展示的错题证据快照。</div>`;
    }

    return wrongItems.map((item) => {
      const qNo = item?.questionNumber ?? "—";
      const userAnswer = item?.userAnswer || "（空）";
      const correctAnswer = item?.correctAnswer || "—";
      const primaryError = item?.primaryError || "—";
      const secondaryErrors = safeArr(item?.secondaryErrors);
      const debugReason = item?.debugReason || "—";
      const evidence = item?.evidence || {};
      const cueWords = safeArr(evidence?.cueWordsInQuestion);
      const distractors = safeArr(evidence?.distractors);
      const paraphraseMap = evidence?.paraphraseMap || {};

      const paraphraseText = Object.keys(paraphraseMap).length
        ? Object.entries(paraphraseMap)
            .map(([k, v]) => `${k} → ${v}`)
            .join("；")
        : "—";

      return `
        <div class="card" style="background:#fff; padding:14px; margin-top:12px;">
          <h3>Q${esc(qNo)}｜主错因：${esc(primaryError)}（${esc(getErrorLabelText(primaryError))}）</h3>
          <div class="simple-text" style="font-size:14px;">
            <div><b>你的答案：</b>${esc(userAnswer)}</div>
            <div style="margin-top:6px;"><b>正确答案：</b>${esc(correctAnswer)}</div>
            <div style="margin-top:6px;"><b>次错因：</b>${esc(secondaryErrors.length ? secondaryErrors.join(" / ") : "—")}</div>
            <div style="margin-top:6px;"><b>判定原因：</b>${esc(debugReason)}</div>
            <div style="margin-top:6px;"><b>题干线索：</b>${esc(cueWords.length ? cueWords.join(" / ") : "—")}</div>
            <div style="margin-top:6px;"><b>替换线索：</b>${esc(paraphraseText)}</div>
            <div style="margin-top:6px;"><b>干扰项：</b>${esc(distractors.length ? distractors.join(" / ") : "—")}</div>
          </div>
        </div>
      `;
    }).join("");
  }

  function renderPremiumDiagnosisPreview(premiumReport) {
    const text = premiumReport?.oneSentenceDiagnosis || "解锁后查看你的个性化 Premium 总诊断。";
    return `
      <div class="simple-text" style="margin-top:8px;">
        ${esc(text)}
      </div>
    `;
  }

  function renderPremiumWeakDimensionsPreview(premiumReport) {
    const items = safeArr(premiumReport?.topWeakDimensionsDetailed).slice(0, 2);
    if (!items.length) {
      return `<div class="simple-text" style="margin-top:8px;">解锁后查看你的 Top3 薄弱维度及逐项解释。</div>`;
    }

    return items.map((item) => `
      <div class="card" style="background:#fff; padding:12px; margin-top:10px;">
        <div style="font-weight:700;">${esc(item.label || getDimensionLabel(item.dimension))}｜${esc(item.score)}%</div>
        <div class="simple-text" style="font-size:14px; margin-top:6px;">
          ${esc(item.interpretation || "")}
        </div>
      </div>
    `).join("") + `
      <div class="muted" style="margin-top:10px;">解锁后查看完整 Top3 短板与维度关联解释。</div>
    `;
  }

  function renderPremiumRootCausesPreview(premiumReport) {
    const items = safeArr(premiumReport?.topRootCauses).slice(0, 2);
    if (!items.length) {
      return `<div class="simple-text" style="margin-top:8px;">解锁后查看 Top3 根因拆解。</div>`;
    }

    return items.map((item) => `
      <div class="card" style="background:#fff; padding:12px; margin-top:10px;">
        <div style="font-weight:700;">${esc(item.title || "")}</div>
        <div class="simple-text" style="font-size:14px; margin-top:6px;">
          ${esc(item.whyItHurts || "")}
        </div>
      </div>
    `).join("") + `
      <div class="muted" style="margin-top:10px;">解锁后查看完整根因链和对应训练方向。</div>
    `;
  }

  function renderPremiumMechanismPreview(premiumReport) {
    const items = safeArr(premiumReport?.errorMechanismChains).slice(0, 2);
    if (!items.length) {
      return `<div class="simple-text" style="margin-top:8px;">解锁后查看你的错误机制链。</div>`;
    }

    return items.map((item) => `
      <div class="card" style="background:#fff; padding:12px; margin-top:10px;">
        <div style="font-weight:700;">${esc(item.name || "")}</div>
        <div class="simple-text" style="font-size:14px; margin-top:6px;">
          ${esc(item.explanation || "")}
        </div>
      </div>
    `).join("") + `
      <div class="muted" style="margin-top:10px;">解锁后查看完整错误链及对应证据题。</div>
    `;
  }

  function renderPremiumEvidencePreview(premiumReport) {
    const groups = safeArr(premiumReport?.evidenceGroups).slice(0, 2);
    if (!groups.length) {
      return `<div class="simple-text" style="margin-top:8px;">解锁后查看分组证据快照。</div>`;
    }

    return groups.map((group) => {
      const samples = safeArr(group.samples).slice(0, 1);
      const sampleHtml = samples.map((item) => `
        <div class="simple-text" style="font-size:14px; margin-top:6px;">
          例：Q${esc(item.questionNumber)}｜你的答案：${esc(item.userAnswer || "（空）")}｜正确答案：${esc(item.correctAnswer || "—")}
        </div>
      `).join("");

      return `
        <div class="card" style="background:#fff; padding:12px; margin-top:10px;">
          <div style="font-weight:700;">${esc(group.errorText || "")}（${esc(group.count || 0)}题）</div>
          ${sampleHtml}
        </div>
      `;
    }).join("") + `
      <div class="muted" style="margin-top:10px;">解锁后查看每组代表性错题的完整证据链。</div>
    `;
  }

  function renderPremiumPlanPreview(premiumReport) {
    const seven = safeArr(premiumReport?.sevenDayPlan).slice(0, 2);
    const fourteen = safeArr(premiumReport?.fourteenDayPlan).slice(0, 1);
    const path = safeArr(premiumReport?.scoreImprovementPath).slice(0, 1);

    let html = "";

    if (seven.length) {
      html += seven.map((item) => `
        <div class="card" style="background:#fff; padding:12px; margin-top:10px;">
          <div style="font-weight:700;">Day ${esc(item.day)}｜${esc(item.focus || "")}</div>
          <div class="simple-text" style="font-size:14px; margin-top:6px;">
            ${esc(item.action || "")}
          </div>
        </div>
      `).join("");
    }

    if (fourteen.length) {
      html += fourteen.map((item) => `
        <div class="card" style="background:#fff; padding:12px; margin-top:10px;">
          <div style="font-weight:700;">${esc(item.phase || "")}｜${esc(item.goal || "")}</div>
          <div class="simple-text" style="font-size:14px; margin-top:6px;">
            ${esc(item.action || "")}
          </div>
        </div>
      `).join("");
    }

    if (path.length) {
      html += `
        <div class="card" style="background:#fff; padding:12px; margin-top:10px;">
          <div style="font-weight:700;">提分路径预估</div>
          <div class="simple-text" style="font-size:14px; margin-top:6px;">
            ${esc(path[0])}
          </div>
        </div>
      `;
    }

    if (!html) {
      html = `<div class="simple-text" style="margin-top:8px;">解锁后查看 7天 / 14天训练计划与提分路径。</div>`;
    } else {
      html += `<div class="muted" style="margin-top:10px;">解锁后查看完整训练处方与全部提分路径。</div>`;
    }

    return html;
  }

  function renderReport(data, attemptId) {
    const app = $("#app");
    const overall = data?.overall || {};

    let timeSpentSec = Number(overall.timeSpentSec ?? 0);
    if (!timeSpentSec || timeSpentSec <= 0) {
      const t0 = Number(localStorage.getItem(`t0_${attemptId}`) || 0);
      if (t0 > 0) timeSpentSec = Math.max(1, Math.round((Date.now() - t0) / 1000));
    }

    const rawCorrect = Number(overall.rawCorrect ?? 0);
    const rawTotal = Number(overall.rawTotal ?? 0);
    const overallPct = pct(rawCorrect, rawTotal);
    const sections = safeArr(data?.sections);
    const bandTable = safeArr(data?.bandTable);
    const topErrors = safeArr(data?.topErrors);
    const itemDiagnostics = safeArr(data?.itemDiagnostics);
    const freeText = getFreeTextFromApiOrFallback(data);
    const premiumPreview = getPremiumPreviewFromApi(data);
    const premiumReport = data?.premiumReport || {};

    const cefrRaw = String(overall.cefr ?? "").trim();
    const cefrDerived =
      !cefrRaw || cefrRaw.toUpperCase() === "NA"
        ? bandToCEFR(overall.band)
        : cefrRaw;

    const module0 = `
      <div class="card" style="grid-column:1/-1;">
        <h2>刷题不涨分，原因不在于你看不懂或听不懂题，往往是缺乏自我认知的能力。</h2>
        <div class="muted" style="margin-top:8px;">
          <div>这份报告会把你在 Listening 的失分，拆成「可修复的具体点」。</div>
          <div style="margin-top:6px;">帮你复盘和精准找出你的短板，以及告诉你该怎么做才能提分。</div>
        </div>
      </div>
    `;

    const module1Overall = `
      <div class="card">
        <h2>考试结果总览</h2>
        <div class="bigScore">${esc(rawCorrect)} / ${esc(rawTotal)}</div>
        <div class="bigScore" style="margin-top:6px;">Band：${esc(bandFromOverall(overall))}</div>

        <div class="muted" style="margin-top:10px;">正确率：${esc(overallPct)}%</div>
        <div class="bar"><div style="width:${overallPct}%"></div></div>

        <div class="kv" style="margin-top:10px;">
          <span class="pill">CEFR: <b>${esc(cefrDerived)}</b></span>
          <span class="pill">Time: <b>${esc(Math.max(1, Math.round(Number(timeSpentSec || 0) / 60)))} mins</b></span>
        </div>

        <div class="hr"></div>

        <div class="muted" style="margin-top:8px;">
          提示：本报告基于你提交的答案生成，评分规则在「附录A」可查看。
        </div>
      </div>
    `;

    const module1Sections = `
      <div class="card">
        <h2>Section得分</h2>
        ${
          sections.length
            ? sections
                .map((s) => {
                  const sc = Number(s.rawCorrect ?? 0);
                  const st = Number(s.rawTotal ?? 0);
                  const sp = pct(sc, st);
                  return `
                    <div class="sectionItem">
                      <div class="sectionLeft">
                        <div class="sectionTitle">${esc(sectionLabel(String(s.section || "")))}</div>
                        <div class="sectionMeta">${esc(sc)} / ${esc(st)}（${esc(sp)}%）</div>
                      </div>
                      <div style="min-width:140px; flex:0 0 140px;">
                        <div class="bar"><div style="width:${sp}%"></div></div>
                      </div>
                    </div>
                  `;
                })
                .join("")
            : `<div class="muted">暂无分 Section 数据。</div>`
        }
      </div>
    `;

    const module3 = `
      <div class="card" style="grid-column:1/-1;">
        <h2>Section 1–4 表现分析</h2>
        <div class="muted">（先用“可读解释 + 分数”上线，后续再接入更细的错因分析）</div>
        <div class="hr"></div>

        ${
          sections.length
            ? sections
                .filter((s) => ["1", "2", "3", "4"].includes(String(s.section)))
                .map((s) => {
                  const sec = String(s.section);
                  const sc = Number(s.rawCorrect ?? 0);
                  const st = Number(s.rawTotal ?? 0);
                  const sp = pct(sc, st);
                  const note = guessSectionNote(sec);
                  return `
                    <div class="sectionItem" style="padding:16px; border:1px solid #eee; border-radius:14px; margin-top:12px;">
                      <div class="sectionLeft">
                        <div class="sectionTitle">Section ${esc(sec)}</div>
                        <div class="sectionMeta">${esc(sc)} / ${esc(st)}（${esc(sp)}%）</div>
                        <div class="muted" style="margin-top:8px;">${esc(note)}</div>
                      </div>
                      <div style="min-width:160px; flex:0 0 160px;">
                        <div class="bar"><div style="width:${sp}%"></div></div>
                      </div>
                    </div>
                  `;
                })
                .join("")
            : `<div class="muted">暂无 Section 分析数据。</div>`
        }

        <div class="hr"></div>
        <div><b>Report note：</b><span class="muted">下一步优先顺序：先修复失分最多的 Section，再补其他部分（解锁后会给到具体错因与训练动作）。</span></div>
      </div>
    `;

    const moduleFree = `
      <div class="card" style="grid-column:1/-1;">
        <h2>当前失分画像（免费版）</h2>
        <p class="simple-text">${esc(freeText.summary)}</p>

        <div class="miniBox">
          <h3>优先修复顺序</h3>
          <p class="simple-text">${esc(freeText.priority)}</p>
        </div>

        <div class="miniBox">
          <h3>今天就能开始的 1 个动作</h3>
          <p class="simple-text">${esc(freeText.action)}</p>
        </div>
      </div>
    `;

    const moduleTopErrors = `
      <div class="card" style="grid-column:1/-1;">
        <h2>高频错因标签（免费可见）</h2>
        <div class="muted">这里展示你本次最常见的失分模式。</div>
        <div class="hr"></div>
        ${renderTopErrors(topErrors)}
      </div>
    `;

    const moduleEvidence = `
      <div class="card" style="grid-column:1/-1;">
        <h2>Evidence Snapshot（错题证据快照）</h2>
        <div class="muted">先展示前 5 道错题的证据快照，方便你确认系统判因是否合理。</div>
        <div class="hr"></div>
        ${renderEvidenceSnapshot(itemDiagnostics)}
      </div>
    `;

    const modulePremium = `
      <div class="card" style="grid-column:1/-1;">
        <h2>完整诊断（Premium 预览）</h2>
        <p class="simple-text">
          解锁后可查看你的完整能力画像、关键短板、错因证据和训练计划。
        </p>

        <details open>
          <summary>一句总诊断（预览）</summary>
          ${renderPremiumDiagnosisPreview(premiumReport)}
        </details>

        <details>
          <summary>12维能力画像（强弱分布 + Top3短板）</summary>
          ${renderPremiumWeakDimensionsPreview(premiumReport)}
        </details>

        <details>
          <summary>Top3 根因拆解</summary>
          ${renderPremiumRootCausesPreview(premiumReport)}
        </details>

        <details>
          <summary>错误机制链（为什么会这样错）</summary>
          ${renderPremiumMechanismPreview(premiumReport)}
        </details>

        <details>
          <summary>分组证据快照（Premium 预览）</summary>
          ${renderPremiumEvidencePreview(premiumReport)}
        </details>

        <details>
          <summary>7天 / 14天训练计划（Premium 预览）</summary>
          ${renderPremiumPlanPreview(premiumReport)}
        </details>

        <details>
          <summary>基础 Premium 指标预览</summary>
          <div class="simple-text" style="margin-top:8px;">
            <div><b>Top3 薄弱维度：</b>${esc(premiumPreview.dimsText)}</div>
            <div style="margin-top:8px;"><b>Top3 高频错因：</b>${esc(premiumPreview.labelsText)}</div>
          </div>
        </details>

        <div class="ctaRow">
          <button type="button" class="btn primary">解锁完整真诊断（内测版）</button>
          <button type="button" class="btn">添加微信领取完整分析</button>
        </div>
      </div>
    `;

    const moduleShare = `
      <div class="card" style="grid-column:1/-1;">
        <h2>邀请其他同学一起免费测试</h2>
        <div class="hr"></div>
        <div class="row">
          <button class="btn" id="copyExamLinkInPageBtn">复制考试链接</button>
          <button class="btn" id="inviteWechatInPageBtn">邀请微信好友一起免费测试</button>
        </div>
      </div>
    `;

    const appendixA = `
      <details>
        <summary><b>附录A（可展开）：对照表（仅参考）</b></summary>

        <div style="margin-top:12px;">
          <div style="font-weight:700; margin: 6px 0;">A1. 答对题数 vs IELTS 对照表（仅参考）</div>
          <div style="margin-top:10px; overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:14px;">
              <thead>
                <tr>
                  <th style="border:1px solid #111; padding:10px 12px; text-align:center; background:#f3f3f3;">
                    Raw score (correct answers)
                  </th>
                  <th style="border:1px solid #111; padding:10px 12px; text-align:center; background:#f3f3f3;">
                    Approx. IELTS Listening Band
                  </th>
                </tr>
              </thead>
              <tbody>
                ${
                  bandTable.length
                    ? bandTable
                        .map((row) => {
                          const raw = row?.raw ?? "";
                          const band = row?.band ?? "";
                          return `
                            <tr>
                              <td style="border:1px solid #111; padding:10px 12px; text-align:center;">${esc(raw)}</td>
                              <td style="border:1px solid #111; padding:10px 12px; text-align:center;">${esc(band)}</td>
                            </tr>
                          `;
                        })
                        .join("")
                    : `
                      <tr>
                        <td style="border:1px solid #111; padding:10px 12px; text-align:center;" colspan="2">
                          ${esc("暂无对照表数据")}
                        </td>
                      </tr>
                    `
                }
              </tbody>
            </table>
          </div>
          <div class="muted" style="margin-top:8px;">
            Footnote: This mapping is approximate and provided for reference only.
          </div>
        </div>

        <div style="height:14px;"></div>

        <div>
          <div style="font-weight:700; margin: 6px 0;">A2. CEFR vs IELTS 对照表（通用参考）</div>
          <div style="margin-top:10px; overflow-x:auto;">
            <table style="width:100%; border-collapse:collapse; font-size:14px;">
              <thead>
                <tr>
                  <th style="border:1px solid #111; padding:10px 12px; text-align:center; background:#f3f3f3;">CEFR 级别</th>
                  <th style="border:1px solid #111; padding:10px 12px; text-align:center; background:#f3f3f3;">描述（能力）</th>
                  <th style="border:1px solid #111; padding:10px 12px; text-align:center; background:#f3f3f3;">IELTS 分数（大致范围）</th>
                </tr>
              </thead>
              <tbody>
                <tr><td style="border:1px solid #111; padding:10px 12px; text-align:center;">A1</td><td style="border:1px solid #111; padding:10px 12px; text-align:center;">初级（能理解和使用非常基础的日常短语）</td><td style="border:1px solid #111; padding:10px 12px; text-align:center;">2.0 – 2.5</td></tr>
                <tr><td style="border:1px solid #111; padding:10px 12px; text-align:center;">A2</td><td style="border:1px solid #111; padding:10px 12px; text-align:center;">基础（能就熟悉话题进行简单交流）</td><td style="border:1px solid #111; padding:10px 12px; text-align:center;">3.0 – 3.5</td></tr>
                <tr><td style="border:1px solid #111; padding:10px 12px; text-align:center;">B1</td><td style="border:1px solid #111; padding:10px 12px; text-align:center;">中级（能处理日常情境，理解熟悉领域信息）</td><td style="border:1px solid #111; padding:10px 12px; text-align:center;">4.0 – 4.5</td></tr>
                <tr><td style="border:1px solid #111; padding:10px 12px; text-align:center;">B2</td><td style="border:1px solid #111; padding:10px 12px; text-align:center;">中高级（能流畅自如地交流，理解复杂文本）</td><td style="border:1px solid #111; padding:10px 12px; text-align:center;">5.5 – 6.5</td></tr>
                <tr><td style="border:1px solid #111; padding:10px 12px; text-align:center;">C1</td><td style="border:1px solid #111; padding:10px 12px; text-align:center;">高级（能流利、灵活运用，理解长篇复杂文本）</td><td style="border:1px solid #111; padding:10px 12px; text-align:center;">7.0 – 8.0</td></tr>
                <tr><td style="border:1px solid #111; padding:10px 12px; text-align:center;">C2</td><td style="border:1px solid #111; padding:10px 12px; text-align:center;">精通（接近母语水平）</td><td style="border:1px solid #111; padding:10px 12px; text-align:center;">8.5 – 9.0</td></tr>
              </tbody>
            </table>
          </div>
          <div class="muted" style="margin-top:8px;">
            Footnote: This mapping is approximate and provided for reference only. (IELTS/CEFR 非严格一一对应)
          </div>
        </div>
      </details>
    `;

    const appendixB = `
      <details>
        <summary><b>附录B（可展开）：Marking Rules（严格评分规则）</b></summary>
        <div class="muted" style="margin-top:10px;">
          <ul style="margin:8px 0 0; padding-left:18px;">
            <li>Spelling must be correct. Misspellings are marked wrong.</li>
            <li>Grammar must be correct where required by the sentence.</li>
            <li>Word limit must be respected (e.g., ONE WORD AND/OR A NUMBER).</li>
            <li>Numbers may be written in digits or words only if the word limit allows (e.g., 8:30 / 8.30; ‘eight thirty’ only when permitted).</li>
            <li>Hyphenation/spacing variants may be accepted when meaning is unchanged (e.g., part-time / part time).</li>
            <li>No free synonym acceptance unless explicitly allowed in the answer key.</li>
          </ul>
        </div>
      </details>
    `;

    const appendixC = `
      <details>
        <summary><b>附录C（可展开）：Report Method（报告计算方法）</b></summary>
        <div class="muted" style="margin-top:10px;">
          <ul style="margin:8px 0 0; padding-left:18px;">
            <li>Raw score = total correct answers (0–40).</li>
            <li>Section score = correct answers within each section.</li>
            <li>Dimension score (Dx) = Correct_Dx / Total_Dx × 100.</li>
          </ul>
        </div>
      </details>
    `;

    const appendixWrap = `
      <div class="card" style="grid-column:1/-1;">
        <h2>附录（可折叠）</h2>
        <div class="hr"></div>
        ${appendixA}
        <div style="height:10px;"></div>
        ${appendixB}
        <div style="height:10px;"></div>
        ${appendixC}
      </div>
    `;

    app.className = "grid two";
    app.innerHTML = `
      ${module0}
      ${module1Overall}
      ${module1Sections}
      ${module3}
      ${moduleFree}
      ${moduleTopErrors}
      ${moduleEvidence}
      ${modulePremium}
      ${moduleShare}
      ${appendixWrap}
    `;

    const pill = $("#attemptIdPill");
    if (pill) pill.textContent = attemptId;

    const copyExamLinkInPageBtn = $("#copyExamLinkInPageBtn");
    if (copyExamLinkInPageBtn) {
      copyExamLinkInPageBtn.onclick = async () => {
        const examUrl = new URL("./full.html", location.href).href;
        try {
          await navigator.clipboard.writeText(examUrl);
          alert("已复制考试链接");
        } catch {
          prompt("复制考试链接：", examUrl);
        }
      };
    }

    const inviteWechatInPageBtn = $("#inviteWechatInPageBtn");
    if (inviteWechatInPageBtn) {
      inviteWechatInPageBtn.onclick = async () => {
        const examUrl = new URL("./full.html", location.href).href;
        const text = `我在做这个雅思听力免费测试，你也来试试：\n${examUrl}`;
        if (navigator.share) {
          try {
            await navigator.share({
              title: "雅思听力免费测试",
              text,
              url: examUrl,
            });
            return;
          } catch {}
        }
        try {
          await navigator.clipboard.writeText(text);
          alert("已复制邀请文案，去微信粘贴发送即可");
        } catch {
          prompt("复制并发送到微信：", text);
        }
      };
    }
  }

  async function load() {
    const attemptId = getAttemptId();

    const h1 = document.querySelector("h1");
    if (h1) h1.textContent = "《雅思听力全方位诊断报告》";

    const allTextNodes = Array.from(document.querySelectorAll("p, .muted, .subtitle, .subTitle, .desc"));
    for (const el of allTextNodes) {
      const t = (el.textContent || "").trim();
      if (t.includes("基于你提交的答案生成") && t.includes("/api/report")) {
        el.style.display = "none";
      }
    }

    const pill = $("#attemptIdPill");
    if (pill) pill.textContent = attemptId || "—";

    if (!attemptId) {
      return renderError("URL 缺少 attemptId 参数。示例：score.html?attemptId=a_123", "");
    }

    try {
      const url = `/api/report_test1?attemptId=${encodeURIComponent(attemptId)}&_t=${Date.now()}`;
      const r = await fetch(url, { method: "GET" });
      const text = await r.text();

      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }

      if (!r.ok) {
        return renderError(`API ${r.status}：${data?.error || text || "请求失败"}`, text);
      }

      if (!data || !data.overall) {
        return renderError("返回数据格式不正确（缺少 overall）", text);
      }

      renderReport(data, attemptId);
    } catch (e) {
      renderError("网络或脚本错误：" + String(e?.message || e), String(e));
    }
  }

  const copyAttemptBtn = $("#copyAttemptBtn");
  if (copyAttemptBtn) copyAttemptBtn.style.display = "none";

  const copyLinkBtn = $("#copyLinkBtn");
  if (copyLinkBtn) {
    copyLinkBtn.textContent = "复制考试链接";
    copyLinkBtn.onclick = async () => {
      const examUrl = new URL("./full.html", location.href).href;
      try {
        await navigator.clipboard.writeText(examUrl);
        alert("已复制考试链接");
      } catch {
        prompt("复制考试链接：", examUrl);
      }
    };
  }

  const refreshBtn = $("#refreshBtn");
  if (refreshBtn) {
    refreshBtn.textContent = "邀请微信好友一起免费测试";
    refreshBtn.onclick = async () => {
      const examUrl = new URL("./full.html", location.href).href;
      const text = `我在做这个雅思听力免费测试，你也来试试：\n${examUrl}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: "雅思听力免费测试",
            text,
            url: examUrl,
          });
          return;
        } catch {}
      }
      try {
        await navigator.clipboard.writeText(text);
        alert("已复制邀请文案，去微信粘贴发送即可");
      } catch {
        prompt("复制并发送到微信：", text);
      }
    };
  }

  load();
})();
