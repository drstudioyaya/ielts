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

  // 你后面把二维码图片地址放这里
  const WECHAT_QR_IMAGE = "";

  function injectExtraStyles() {
    if (document.getElementById("score-extra-styles")) return;
    const style = document.createElement("style");
    style.id = "score-extra-styles";
    style.textContent = `
      .tagWrap{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        margin-top:8px;
      }
      .tagCard{
        display:flex;
        flex-direction:column;
        gap:4px;
        padding:12px 14px;
        border:1px solid #e5e7eb;
        border-radius:14px;
        background:#fff;
        min-width:140px;
      }
      .tagTitle{
        font-weight:700;
        font-size:14px;
        color:#111827;
      }
      .tagMeta{
        font-size:12px;
        color:#6b7280;
      }
      .miniBox{
        margin-top:16px;
        padding:14px;
        border:1px solid #e5e7eb;
        border-radius:12px;
        background:#fff;
      }
      .simple-text{
        color:#111827;
        line-height:1.8;
        font-size:15px;
      }
      .ctaRow{
        display:flex;
        gap:12px;
        flex-wrap:wrap;
        margin-top:18px;
      }
      .blurLockCard{
        position:relative;
        overflow:hidden;
        border:1px solid #e5e7eb;
        border-radius:14px;
        background:linear-gradient(180deg,#fafafa 0%,#f3f4f6 100%);
        min-height:200px;
      }
      .blurMask{
        position:absolute;
        inset:0;
        background:
          linear-gradient(to bottom, rgba(255,255,255,.35), rgba(255,255,255,.92)),
          repeating-linear-gradient(
            -20deg,
            rgba(17,24,39,.06) 0px,
            rgba(17,24,39,.06) 8px,
            rgba(255,255,255,.12) 8px,
            rgba(255,255,255,.12) 16px
          );
        backdrop-filter: blur(4px);
      }
      .blurContent{
        position:relative;
        z-index:2;
        padding:22px 18px;
      }
      .blurTitle{
        font-size:18px;
        font-weight:800;
        color:#111827;
      }
      .blurText{
        margin-top:8px;
        color:#374151;
        line-height:1.8;
        font-size:14px;
      }
      .inlineHint{
        margin-top:10px;
        font-size:13px;
        color:#6b7280;
      }
      .qBlock{
        margin-top:12px;
        padding:14px;
        border:1px solid #e5e7eb;
        border-radius:14px;
        background:#fff;
      }
      .qTitle{
        font-weight:800;
        font-size:16px;
        margin-bottom:8px;
        color:#111827;
      }
      .qQuestion{
        font-size:14px;
        line-height:1.8;
        color:#111827;
        margin-bottom:8px;
      }
      .qMeta{
        font-size:14px;
        line-height:1.8;
        color:#111827;
      }
      .subtleLine{
        margin-top:10px;
        font-size:13px;
        color:#6b7280;
      }
      .premiumPreviewCard{
        margin-top:12px;
        padding:14px;
        border:1px solid #e5e7eb;
        border-radius:14px;
        background:#fff;
      }
      .premiumPreviewTitle{
        font-weight:700;
        font-size:15px;
        color:#111827;
      }
      .premiumPreviewText{
        margin-top:6px;
        font-size:14px;
        line-height:1.8;
        color:#374151;
      }
      .wxModal{
        position:fixed;
        inset:0;
        background:rgba(17,24,39,.55);
        display:none;
        align-items:center;
        justify-content:center;
        padding:20px;
        z-index:9999;
      }
      .wxModal.show{
        display:flex;
      }
      .wxModalCard{
        width:min(92vw, 460px);
        background:#fff;
        border-radius:18px;
        padding:18px;
        box-shadow:0 20px 60px rgba(0,0,0,.18);
      }
      .wxModalTitle{
        font-size:20px;
        font-weight:800;
        color:#111827;
      }
      .wxModalDesc{
        margin-top:8px;
        font-size:14px;
        line-height:1.8;
        color:#4b5563;
      }
      .wxQrBox{
        margin-top:14px;
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:14px;
        background:#f9fafb;
        text-align:center;
      }
      .wxQrBox img{
        max-width:220px;
        width:100%;
        height:auto;
        border-radius:10px;
        display:block;
        margin:0 auto;
      }
      .wxQrPlaceholder{
        padding:28px 12px;
        color:#6b7280;
        font-size:14px;
        line-height:1.8;
      }
      .wxCopyBox{
        margin-top:14px;
        border:1px solid #e5e7eb;
        border-radius:14px;
        padding:14px;
        background:#fff;
      }
      .wxCopyText{
        white-space:pre-wrap;
        word-break:break-word;
        font-size:14px;
        line-height:1.8;
        color:#111827;
      }
      .wxBtnRow{
        display:flex;
        gap:10px;
        flex-wrap:wrap;
        margin-top:14px;
      }
      @media (max-width: 860px){
        .tagCard{
          min-width:unset;
          width:calc(50% - 5px);
        }
      }
      @media (max-width: 560px){
        .tagCard{
          width:100%;
        }
      }
    `;
    document.head.appendChild(style);
  }

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

  function bandFromOverall(overall) {
    const b = overall?.band;
    if (b === null || b === undefined || b === "") return "—";
    return String(b);
  }

  function buildWechatUnlockText(attemptId, overall) {
    const band = overall?.band ?? "—";
    return `老师，我刚做完雅思听力测试，想领取完整分析报告。
我的听力诊断编号：${attemptId || "—"}
我的听力分数是：${band}`;
  }

  async function copyWechatUnlockText(attemptId, overall) {
    const text = buildWechatUnlockText(attemptId, overall);
    try {
      await navigator.clipboard.writeText(text);
      alert("已复制发送文案，添加微信后直接粘贴发送即可");
    } catch {
      prompt("复制后发送给老师：", text);
    }
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

  function getQuestionTypeLabel(type) {
    const map = {
      form_completion: "表格填空",
      sentence_completion: "句子填空",
      note_completion: "笔记填空",
      single_choice: "单选题",
      matching: "匹配题",
      map_labeling: "地图题"
    };
    return map[type] || "题目";
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
      dimsText: dims.length ? dims.map(getDimensionLabel).join(" / ") : "解锁后查看你的 Top3 薄弱维度",
      labelsText: labels.length ? labels.map(getErrorLabelText).join(" / ") : "解锁后查看你最常见的失分模式"
    };
  }

  function createWxModal(attemptId, overall) {
    if (document.getElementById("wxModal")) return;

    const modal = document.createElement("div");
    modal.id = "wxModal";
    modal.className = "wxModal";
    modal.innerHTML = `
      <div class="wxModalCard">
        <div class="wxModalTitle">添加微信领取完整版诊断分析</div>
        <div class="wxModalDesc">
          添加微信后，把下方文案直接粘贴发送给老师即可。
        </div>

        <div class="wxQrBox">
          ${
            WECHAT_QR_IMAGE
              ? `<img src="${esc(WECHAT_QR_IMAGE)}" alt="微信二维码" />`
              : `<div class="wxQrPlaceholder">二维码图片稍后替换到 <b>WECHAT_QR_IMAGE</b> 变量里即可。</div>`
          }
        </div>

        <div class="wxCopyBox">
          <div class="wxCopyText" id="wxCopyText">${esc(buildWechatUnlockText(attemptId, overall))}</div>
        </div>

        <div class="wxBtnRow">
          <button type="button" class="btn primary" id="wxCopyBtn">一键复制发送文案</button>
          <button type="button" class="btn" id="wxCloseBtn">关闭</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.classList.remove("show");
    });

    const closeBtn = document.getElementById("wxCloseBtn");
    if (closeBtn) closeBtn.onclick = () => modal.classList.remove("show");

    const copyBtn = document.getElementById("wxCopyBtn");
    if (copyBtn) {
      copyBtn.onclick = () => copyWechatUnlockText(attemptId, overall);
    }
  }

  function openWxModal(attemptId, overall) {
    createWxModal(attemptId, overall);
    const modal = document.getElementById("wxModal");
    if (modal) {
      const textNode = document.getElementById("wxCopyText");
      if (textNode) textNode.textContent = buildWechatUnlockText(attemptId, overall);
      modal.classList.add("show");
    }
  }

  function loadQuestionBank() {
    return new Promise((resolve) => {
      if (window.PREMIUM_TEST1) return resolve(window.PREMIUM_TEST1);

      const existing = document.getElementById("dynamic-questions-js");
      if (existing) {
        existing.addEventListener("load", () => resolve(window.PREMIUM_TEST1 || null), { once: true });
        existing.addEventListener("error", () => resolve(null), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.id = "dynamic-questions-js";
      script.src = "./questions.js?v=" + Date.now();
      script.onload = () => resolve(window.PREMIUM_TEST1 || null);
      script.onerror = () => resolve(null);
      document.body.appendChild(script);
    });
  }

  function getQuestionObjectFromBank(bank, questionNumber) {
    if (!bank) return null;
    const sections = ["section1", "section2", "section3", "section4"];
    for (const sec of sections) {
      const arr = bank?.[sec]?.questions;
      if (!Array.isArray(arr)) continue;
      const found = arr.find((q) => Number(q.number) === Number(questionNumber));
      if (found) return found;
    }
    return null;
  }

  function buildFullQuestionText(bankQuestion, item) {
    const qType = getQuestionTypeLabel(item?.questionType);

    if (!bankQuestion) {
      const evidence = item?.evidence || {};
      const cues = safeArr(evidence?.cueWordsInQuestion);
      return cues.length ? `${qType}｜${cues.join(" / ")}` : qType;
    }

    const qText = bankQuestion.question ? String(bankQuestion.question) : "";
    const options = safeArr(bankQuestion.options);

    if (options.length) {
      const optionText = options
        .map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`)
        .join(" / ");
      return `${qText} 选项：${optionText}`;
    }

    return qText || qType;
  }

  function renderErrorTags(topErrors, itemDiagnostics) {
    const filtered = safeArr(topErrors)
      .filter((item) => String(item?.label || "") !== "K1")
      .slice(0, 5);

    const k1Count = safeArr(itemDiagnostics).filter(
      (item) => !item.isCorrect && String(item?.primaryError || "") === "K1"
    ).length;

    const tagsHtml = filtered.length
      ? `
        <div class="tagWrap">
          ${filtered.map((item, idx) => {
            const label = item?.label || "";
            const count = Number(item?.count || 0);
            const bg = idx === 0 ? "#111827" : idx === 1 ? "#1f2937" : "#374151";
            return `
              <div class="tagCard" style="background:${bg}; border-color:${bg}; color:#fff;">
                <div class="tagTitle" style="color:#fff;">${esc(getErrorLabelText(label))}</div>
                <div class="tagMeta" style="color:rgba(255,255,255,.78);">${esc(label)} × ${esc(count)}</div>
              </div>
            `;
          }).join("")}
        </div>
      `
      : `<div class="muted">暂无可展示的高频错因。</div>`;

    const hintHtml = k1Count > 0
      ? `<div class="inlineHint">另有 ${esc(k1Count)} 题未作答，可能影响诊断完整度。</div>`
      : "";

    return tagsHtml + hintHtml;
  }

  function renderEvidenceSnapshot(itemDiagnostics, questionBank) {
    const wrongItems = safeArr(itemDiagnostics)
      .filter((item) => !item.isCorrect && String(item?.primaryError || "") !== "K1")
      .slice(0, 2);

    const cards = wrongItems.map((item) => {
      const qNo = item?.questionNumber ?? "—";
      const bankQuestion = getQuestionObjectFromBank(questionBank, qNo);
      const questionText = buildFullQuestionText(bankQuestion, item);
      const userAnswer = item?.userAnswer || "（空）";
      const correctAnswer = item?.correctAnswer || "—";
      const primaryError = item?.primaryError || "—";
      const debugReason = item?.debugReason || "—";

      return `
        <div class="qBlock">
          <div class="qTitle">Q${esc(qNo)}</div>
          <div class="qQuestion"><b>题目：</b>${esc(questionText)}</div>
          <div class="qMeta"><b>你的答案：</b>${esc(userAnswer)}</div>
          <div class="qMeta"><b>正确答案：</b>${esc(correctAnswer)}</div>
          <div class="qMeta"><b>主错因：</b>${esc(getErrorLabelText(primaryError))}</div>
          <div class="qMeta"><b>判定原因：</b>${esc(debugReason)}</div>
        </div>
      `;
    }).join("");

    return `
      ${cards || `<div class="muted">本次没有可展示的代表性错题证据。</div>`}
      <div class="blurLockCard" style="margin-top:12px;">
        <div class="blurMask"></div>
        <div class="blurContent">
          <div class="blurTitle">其余错题证据快照、Top3根因拆解、7天训练计划已折叠</div>
          <div class="blurText">
            添加微信后可领取完整版诊断分析，获取更多错题证据、完整根因分析和训练建议。
          </div>
          <div class="ctaRow" style="margin-top:12px;">
            <button type="button" class="btn primary" id="copyWechatUnlockBtn">解锁完整雅思听力诊断分析报告</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderPremiumSummary(premiumReport, premiumPreview) {
    const oneLine = premiumReport?.oneSentenceDiagnosis || "添加微信后可领取更完整的诊断分析。";
    const weak = safeArr(premiumReport?.topWeakDimensionsDetailed).slice(0, 1)[0];
    const weakText = weak
      ? `${weak.label}｜${weak.score}%`
      : premiumPreview?.dimsText || "Top3 薄弱维度";
    const root = safeArr(premiumReport?.topRootCauses).slice(0, 1)[0];
    const rootText = root?.title || "Top3 根因拆解";
    const mech = safeArr(premiumReport?.errorMechanismChains).slice(0, 1)[0];
    const mechText = mech?.name || "错误机制链";

    return `
      <div class="premiumPreviewCard">
        <div class="premiumPreviewTitle">一句总诊断（预览）</div>
        <div class="premiumPreviewText">${esc(oneLine)}</div>
      </div>

      <div class="premiumPreviewCard">
        <div class="premiumPreviewTitle">薄弱能力（预览）</div>
        <div class="premiumPreviewText">${esc(weakText)}</div>
      </div>

      <div class="premiumPreviewCard">
        <div class="premiumPreviewTitle">Top3 根因拆解（预览）</div>
        <div class="premiumPreviewText">${esc(rootText)}</div>
      </div>

      <div class="premiumPreviewCard">
        <div class="premiumPreviewTitle">错误机制链（预览）</div>
        <div class="premiumPreviewText">${esc(mechText)}</div>
      </div>

      <div class="subtleLine">
        添加微信后可领取完整版诊断分析；后续也可升级为更深入的提分报告。
      </div>
    `;
  }

  async function renderReport(data, attemptId) {
    injectExtraStyles();

    const app = $("#app");
    const overall = data?.overall || {};
    const sections = safeArr(data?.sections);
    const topErrors = safeArr(data?.topErrors);
    const itemDiagnostics = safeArr(data?.itemDiagnostics);
    const bandTable = safeArr(data?.bandTable);
    const freeText = getFreeTextFromApiOrFallback(data);
    const premiumPreview = getPremiumPreviewFromApi(data);
    const premiumReport = data?.premiumReport || {};
    const questionBank = await loadQuestionBank();

    let timeSpentSec = Number(overall.timeSpentSec ?? 0);
    if (!timeSpentSec || timeSpentSec <= 0) {
      const t0 = Number(localStorage.getItem(`t0_${attemptId}`) || 0);
      if (t0 > 0) timeSpentSec = Math.max(1, Math.round((Date.now() - t0) / 1000));
    }

    const rawCorrect = Number(overall.rawCorrect ?? 0);
    const rawTotal = Number(overall.rawTotal ?? 0);
    const overallPct = pct(rawCorrect, rawTotal);

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
      </div>
    `;

    const module1Sections = `
      <div class="card">
        <h2>Section得分</h2>
        ${
          sections.length
            ? sections.map((s) => {
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
              }).join("")
            : `<div class="muted">暂无 Section 数据。</div>`
        }
      </div>
    `;

    const moduleFree = `
      <div class="card" style="grid-column:1/-1;">
        <h2>当前失分画像</h2>
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
        <h2>高频错因标签</h2>
        <div class="muted">这里展示你本次最常见的真实失分模式。</div>
        <div class="hr"></div>
        ${renderErrorTags(topErrors, itemDiagnostics)}
      </div>
    `;

    const moduleEvidence = `
      <div class="card" style="grid-column:1/-1;">
        <h2>Evidence Snapshot</h2>
        <div class="muted">先展示 2 个完整错题证据。</div>
        <div class="hr"></div>
        ${renderEvidenceSnapshot(itemDiagnostics, questionBank)}
      </div>
    `;

    const modulePremium = `
      <div class="card" style="grid-column:1/-1;">
        <h2>完整诊断报告</h2>
        ${renderPremiumSummary(premiumReport, premiumPreview)}
        <div class="ctaRow">
          <button type="button" class="btn primary" id="copyWechatPremiumBtn">添加微信领取完整版诊断分析</button>
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
                  <th style="border:1px solid #111; padding:10px 12px; text-align:center; background:#f3f3f3;">Raw score (correct answers)</th>
                  <th style="border:1px solid #111; padding:10px 12px; text-align:center; background:#f3f3f3;">Approx. IELTS Listening Band</th>
                </tr>
              </thead>
              <tbody>
                ${
                  bandTable.length
                    ? bandTable.map((row) => `
                        <tr>
                          <td style="border:1px solid #111; padding:10px 12px; text-align:center;">${esc(row?.raw ?? "")}</td>
                          <td style="border:1px solid #111; padding:10px 12px; text-align:center;">${esc(row?.band ?? "")}</td>
                        </tr>
                      `).join("")
                    : `<tr><td style="border:1px solid #111; padding:10px 12px; text-align:center;" colspan="2">暂无对照表数据</td></tr>`
                }
              </tbody>
            </table>
          </div>
          <div class="muted" style="margin-top:8px;">Footnote: This mapping is approximate and provided for reference only.</div>
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
          <div class="muted" style="margin-top:8px;">Footnote: This mapping is approximate and provided for reference only. (IELTS/CEFR 非严格一一对应)</div>
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
            <li>Numbers may be written in digits or words only if the word limit allows.</li>
            <li>Hyphenation/spacing variants may be accepted when meaning is unchanged.</li>
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
      ${moduleFree}
      ${moduleTopErrors}
      ${moduleEvidence}
      ${modulePremium}
      ${moduleShare}
      ${appendixWrap}
    `;

    createWxModal(attemptId, overall);

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
            await navigator.share({ title: "雅思听力免费测试", text, url: examUrl });
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

    const copyWechatUnlockBtn = $("#copyWechatUnlockBtn");
    if (copyWechatUnlockBtn) copyWechatUnlockBtn.onclick = () => openWxModal(attemptId, overall);

    const copyWechatPremiumBtn = $("#copyWechatPremiumBtn");
    if (copyWechatPremiumBtn) copyWechatPremiumBtn.onclick = () => openWxModal(attemptId, overall);

    const pill = $("#attemptIdPill");
    if (pill) pill.textContent = attemptId;
  }

  async function load() {
    injectExtraStyles();

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

      await renderReport(data, attemptId);
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
          await navigator.share({ title: "雅思听力免费测试", text, url: examUrl });
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
