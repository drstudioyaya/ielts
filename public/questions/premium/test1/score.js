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

    if (
      apiFree &&
      typeof apiFree.summary === "string" &&
      apiFree.summary.trim()
    ) {
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
    const freeText = getFreeTextFromApiOrFallback(data);
    const premiumPreview = getPremiumPreviewFromApi(data);

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

    const modulePremium = `
      <div class="card" style="grid-column:1/-1;">
        <h2>完整诊断（Premium 预览）</h2>
        <p class="simple-text">
          解锁后可查看你的完整能力画像、关键短板、错因证据和训练计划。
        </p>

        <details>
          <summary>12维能力画像（强弱分布 + Top3短板）</summary>
          <div class="simple-text" style="margin-top:8px;">
            ${esc(premiumPreview.dimsText)}
          </div>
        </details>

        <details>
          <summary>高频错因标签</summary>
          <div class="simple-text" style="margin-top:8px;">
            ${esc(premiumPreview.labelsText)}
          </div>
        </details>

        <details>
          <summary>Evidence Snapshot（证据快照）</summary>
          <div class="simple-text" style="margin-top:8px;">
            解锁后查看“你的答案 vs 标准答案 vs 判分规则”的具体证据。
          </div>
        </details>

        <details>
          <summary>7天 / 14天训练计划</summary>
          <div class="simple-text" style="margin-top:8px;">
            解锁后获取按你的薄弱点定制的训练动作。
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
