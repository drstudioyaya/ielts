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
    // 先占位：后续你接入“错因/能力维度”后，再动态生成更准的 note
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

  function renderReport(data, attemptId) {
    const app = $("#app");
    const overall = data?.overall || {};
    const rawCorrect = Number(overall.rawCorrect ?? 0);
    const rawTotal = Number(overall.rawTotal ?? 0);
    const headlineCn = overall.headlineCn || "";

    const overallPct = pct(rawCorrect, rawTotal);

    const sections = safeArr(data?.sections);
    const bandTable = safeArr(data?.bandTable);

    const paywall = data?.paywall || {};
    const locked = safeArr(paywall.locked);
    const freeVisible = safeArr(paywall.freeVisible);

    // ---- Module 0：情绪锚点（单独一张卡，放在总分卡片上方）----
    const module0 = `
      <div class="card" style="grid-column:1/-1;">
        <h2>刷题不涨分，原因不在于你看不懂或听不懂题，往往是缺乏自我认知的能力。</h2>
        <div class="muted" style="margin-top:8px;">
          <div>这份报告会把你在 Listening 的失分，拆成「可修复的具体点」。</div>
          <div style="margin-top:6px;">帮你复盘和精准找出你的短板，以及告诉你该怎么做才能提分。</div>
        </div>
      </div>
    `;

    // ---- Module 1：考试结果总览（第一屏必须看见）----
    const module1Overall = `
      <div class="card">
        <h2>考试结果总览</h2>
        <div class="bigScore">${esc(rawCorrect)} / ${esc(rawTotal)}</div>
        <div class="bigScore" style="margin-top:6px;">Band：${esc(bandFromOverall(overall))}</div>

        <div class="muted" style="margin-top:10px;">正确率：${esc(overallPct)}%</div>
        <div class="bar"><div style="width:${overallPct}%"></div></div>

        <div class="kv" style="margin-top:10px;">
          <span class="pill">CEFR: <b>${esc(overall.cefr ?? "NA")}</b></span>
          <span class="pill">Time: <b>${esc(overall.timeSpentSec ?? 0)}s</b></span>
        </div>

        <div class="hr"></div>

    
        <div class="muted" style="margin-top:8px;">
          提示：本报告基于你提交的答案生成，评分规则在「附录A」可查看。
        </div>
      </div>
    `;

    // ---- 右侧：Section 得分 ----
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
            : `<div class="muted">暂无分 Section 数据（例如 mock 报告会是空的，这是正常的）。</div>`
        }
      </div>
    `;

    // ---- Module 3：Section 1–4 表现分析（表格+简短 note）----
    // 这里先用 sections 的分数 + 固定 note 占位，后续接错因后再升级
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

    // ---- 诊断总览（预览）----
    const moduleDiagPreview = `
      <div class="card" style="grid-column:1/-1;">
        <h2>诊断总览（预览）</h2>
        <div class="muted">这里未来会显示：12维能力雷达 / 高频错误类型 / 关键证据句（现在先把模块占位搭起来）。</div>
        <div class="hr"></div>
        <div class="muted">当前免费可见：<b>${esc(freeVisible.join(", ") || "—")}</b></div>
        <div class="muted" style="margin-top:6px;">当前锁定：<b>${esc(locked.join(", ") || "—")}</b></div>
      </div>
    `;

    // ---- Module 4/4.5/5/6：占位（保持你现有结构）----
    const module4 = `
      <div class="card" style="grid-column:1/-1;">
        <h2>Listening Skills Profile（12维能力画像）</h2>
        <div class="muted">你将看到 12 个核心能力维度的强弱分布（如：同义替换识别、信息定位、数字拼写、干扰项抗性等）。</div>
        <div class="hr"></div>
        <div class="muted">当前为预览版：解锁后展示完整能力条 + 你的关键短板 Top 3。</div>
      </div>
    `;

    const module45 = `
      <div class="card" style="grid-column:1/-1;">
        <h2>Evidence Snapshot（证据快照）</h2>
        <div class="muted">我们不会只给“结论”，还会给“证据”。解锁后你会看到每一类错因对应的证据快照（你的答案 vs 标准答案 vs 规则）。</div>
        <div class="hr"></div>
        <div class="muted">示例（占位）：</div>
        <ul class="muted" style="margin-top:8px; padding-left:18px;">
          <li>字数限制导致 0 分（例如：题干要求 ONE WORD，但输入了 two words）</li>
          <li>同义替换未识别 → 定位错行</li>
          <li>选择题被干扰项带走 → 选了“听到的词”而不是“问题要的”</li>
        </ul>
      </div>
    `;

    const module5 = `
      <div class="card" style="grid-column:1/-1;">
        <h2>你的关键短板结论（解锁后生成）</h2>
        <div class="muted">你将获得：1句总诊断 + 3个关键短板 + 每个短板的根因解释（带证据）。</div>
        <div class="hr"></div>
        <div class="muted">示例（占位）：</div>
        <ul class="muted" style="margin-top:8px; padding-left:18px;">
          <li>短板1：同义替换识别不足 → 导致定位错行</li>
          <li>短板2：数字/日期格式不稳定 → 明明听对却丢分</li>
          <li>短板3：干扰项抗性弱 → 选择题容易被误导</li>
        </ul>
      </div>
    `;

    const module6 = `
      <div class="card" style="grid-column:1/-1;">
        <h2>14 天可执行训练计划（解锁后生成）</h2>
        <div class="muted">今天就能做（3选1）：</div>
        <ol class="muted" style="margin-top:8px; padding-left:18px;">
          <li><b>数字/日期快练 8 分钟</b>：只练时间、日期、数字连读（正确率&gt;90%再加速）</li>
          <li><b>同义替换 10 分钟</b>：把题干关键词替换写 3 个同义表达</li>
          <li><b>干扰项对抗 1 组题</b>：做完必须写“我为什么选错”（一句话）</li>
        </ol>
        <div class="hr"></div>
        <div class="muted">解锁后：Top3短板 → Today Action + 7天计划 + 14天强化计划 + 课程入口。</div>
      </div>
    `;

    // ---- Module 7：付费解锁模块（CTA 文案改）----
    const module7 = `
      <div class="card" style="grid-column:1/-1;">
        <h2>解锁完整版诊断（Premium）</h2>
        <div class="muted">解锁后你将获得：</div>
        <ul class="muted" style="margin-top:10px; padding-left:18px;">
          <li>✅ 12维能力画像（强弱分布 + Top3短板）</li>
          <li>✅ 高频错因标签（你最常见的失分模式）</li>
          <li>✅ Evidence Snapshot（每类错因的证据快照）</li>
          <li>✅ 14天行动计划（可直接照做）</li>
          <li>✅ 课程/训练入口（按短板匹配）</li>
        </ul>
        <div class="hr"></div>
        <div class="row">
          <a class="btn primary" href="/pricing" style="text-decoration:none;">解锁完整真诊断（内测报名）</a>
        </div>
      </div>
    `;

    // ---- 分享与复盘：改为“邀请其他同学一起免费测试” + 两个按钮 ----
    // 说明文字删掉；按钮改为：复制考试链接 / 邀请微信好友一起免费测试
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

// ---- 附录（可折叠）：A/B/C ----
const appendicesHTML = `
  <div class="card" style="grid-column: 1 / -1;">
    <h2>附录（可折叠）</h2>

    <!-- 附录A：对照表（仅参考） -->
    <details>
      <summary><b>附录A｜对照表（Approximate / For reference only）</b></summary>
      <div class="muted" style="margin-top:10px; line-height:1.7;">
        <b>重要：</b>以下对照为 <b>Approximate / For reference only</b>，用于帮助理解大致区间，
        不代表官方“精确映射”，不同考试版本与场次可能存在差异。
      </div>

      <div class="hr"></div>

      <h3 style="margin: 10px 0;">A1. 答对题数 vs IELTS Band 对照表（仅参考）</h3>
      <div class="muted" style="margin-bottom:8px;">
        Approximate / For reference only. 仅用于展示常见区间参考。
      </div>

      ${
        Array.isArray(data?.bandTable) && data.bandTable.length
          ? `
            <div class="list">
              ${data.bandTable
                .map((row) => {
                  const raw = row?.raw ?? "";
                  const band = row?.band ?? "";
                  return `
                    <div class="listRow">
                      <div><b>Raw ${esc(raw)}</b></div>
                      <div style="text-align:right;"><b>${esc(band)}</b></div>
                    </div>
                  `;
                })
                .join("")}
            </div>
          `
          : `
            <div class="muted">
              暂无 bandTable 数据（如需展示，请确保 /api/report 返回 bandTable）。
            </div>
          `
      }

      <div class="hr"></div>

      <h3 style="margin: 10px 0;">A2. CEFR vs IELTS 对照表（仅参考）</h3>
      <div class="muted" style="margin-bottom:8px;">
        Approximate / For reference only. 仅用于理解区间，不代表官方精确映射。
      </div>

      <div class="list">
        <div class="listRow"><div><b>CEFR C2</b></div><div style="text-align:right;"><b>IELTS 8.5–9.0</b></div></div>
        <div class="listRow"><div><b>CEFR C1</b></div><div style="text-align:right;"><b>IELTS 7.0–8.0</b></div></div>
        <div class="listRow"><div><b>CEFR B2</b></div><div style="text-align:right;"><b>IELTS 5.5–6.5</b></div></div>
        <div class="listRow"><div><b>CEFR B1</b></div><div style="text-align:right;"><b>IELTS 4.0–5.0</b></div></div>
        <div class="listRow"><div><b>CEFR A2</b></div><div style="text-align:right;"><b>IELTS 3.0–3.5</b></div></div>
        <div class="listRow"><div><b>CEFR A1</b></div><div style="text-align:right;"><b>IELTS ≤2.5</b></div></div>
      </div>

      <div class="muted" style="margin-top:10px; line-height:1.7;">
        <b>Note:</b> CEFR 与 IELTS 的对应关系在不同机构与研究中会有不同版本；本处仅作信息参考（Approximate）。
      </div>
    </details>

    <div class="hr"></div>

    <!-- 附录B：严格评分规则 -->
    <details>
      <summary><b>附录B｜Marking Rules（严格评分规则）</b></summary>

      <div class="muted" style="margin-top:10px; line-height:1.7;">
        以下规则建议以可展开方式呈现。<b>原文需保留</b>；如需中文解释可附在后面。
      </div>

      <div class="hr"></div>

      <ul style="line-height:1.8; padding-left:20px; margin: 10px 0;">
        <li><b>Spelling must be correct. Misspellings are marked wrong.</b>
          <div class="muted">拼写必须正确；拼错判错。</div>
        </li>
        <li><b>Grammar must be correct where required by the sentence.</b>
          <div class="muted">在句子要求语法正确的地方，语法错误判错。</div>
        </li>
        <li><b>Word limit must be respected (e.g., ONE WORD AND/OR A NUMBER).</b>
          <div class="muted">必须遵守字数限制（例如：ONE WORD AND/OR A NUMBER）。</div>
        </li>
        <li><b>Numbers may be written in digits or words only if the word limit allows (e.g., 8:30 / 8.30; ‘eight thirty’ only when permitted).</b>
          <div class="muted">数字可用阿拉伯数字或英文拼写，但必须符合字数限制（如 8:30 / 8.30；只有在允许时 ‘eight thirty’ 才算对）。</div>
        </li>
        <li><b>Hyphenation/spacing variants may be accepted when meaning is unchanged (e.g., part-time / part time).</b>
          <div class="muted">当意义不变时，连字符/空格变体可能被接受（如 part-time / part time）。</div>
        </li>
        <li><b>No free synonym acceptance unless explicitly allowed in the answer key.</b>
          <div class="muted">除非题库答案明确允许，否则不做“同义词自由放宽”。</div>
        </li>
        <li><b>补充（口径锁定）：所有“可接受变体（accepted variants）”必须在题库 Answer Key 层明确配置并随题发布；评分引擎/前端不做主观放宽。</b></li>
      </ul>
    </details>

    <div class="hr"></div>

    <!-- 附录C：报告计算方法 -->
    <details>
      <summary><b>附录C｜Report Method（报告计算方法）</b></summary>

      <div class="muted" style="margin-top:10px; line-height:1.7;">
        说明：本附录用于解释报告的计算逻辑与后续 Premium 模块生成方式（可扩展）。
      </div>

      <div class="hr"></div>

      <ul style="line-height:1.8; padding-left:20px; margin: 10px 0;">
        <li><b>Raw score = total correct answers (0–40).</b></li>
        <li><b>Section score = correct answers within each section.</b></li>
        <li><b>Dimension score (Dx) = Correct_Dx / Total_Dx × 100.</b></li>
        <li><b>Optional Premium weighting by section difficulty can be used, but keep UI simple and explain weighting here (expandable).</b>
          <div class="muted">可选：按 Section 难度做 Premium 加权；UI 保持简洁，权重细节只在这里说明。</div>
        </li>
        <li><b>Evidence Snapshot 生成逻辑：</b>
          <div style="margin-top:6px;">
            (a) 最低的 Dx 维度（Top 2–3）<br/>
            (b) 错题的题号范围聚类（clustered ranges）<br/>
            (c) 主导错误标签（dominant error labels，必须来自附录D Error Taxonomy）
          </div>
        </li>
      </ul>

      <div class="muted" style="margin-top:10px; line-height:1.7;">
        <b>版本说明：</b>本文件为评分页信息架构与文案结构总稿，用于前端开发与内容锁定。
      </div>
    </details>
  </div>
`;


    // ---- 渲染总布局（模块0放在总分卡片上方）----
    app.className = "grid two";
    app.innerHTML = `
      ${module0}

      ${module1Overall}
      ${module1Sections}

      <!-- 模块2已按你的要求删除（Band 对照表保留在附录B） -->

      ${module3}
      ${moduleDiagPreview}
      ${module4}
      ${module45}
      ${module5}
      ${module6}
      ${module7}
      ${moduleShare}
      ${appendixWrap}
    `;

    // 填充顶部 attemptId
    const pill = $("#attemptIdPill");
    if (pill) pill.textContent = attemptId;

    // 页面内分享按钮
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
        // 优先用系统分享（手机更友好）；否则复制文案让你粘贴到微信
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

    // 1) 大标题改名（尽量不改 HTML，直接在 JS 里兜底）
    const h1 = document.querySelector("h1");
    if (h1) h1.textContent = "《雅思听力全方位诊断报告》";

    // 2) 删掉副标题那行“基于你提交的答案生成...”（尽量不改 HTML，JS 里隐藏）
    //    做法：找到包含该关键句的元素并隐藏
    const allTextNodes = Array.from(document.querySelectorAll("p, .muted, .subtitle, .subTitle, .desc"));
    for (const el of allTextNodes) {
      const t = (el.textContent || "").trim();
      if (t.includes("基于你提交的答案生成") && t.includes("/api/report")) {
        el.style.display = "none";
      }
    }

    // 顶部 attemptId pill
    const pill = $("#attemptIdPill");
    if (pill) pill.textContent = attemptId || "—";

    if (!attemptId) {
      return renderError("URL 缺少 attemptId 参数。示例：score.html?attemptId=a_123", "");
    }

    try {
      const url = `/api/report?attemptId=${encodeURIComponent(attemptId)}&_t=${Date.now()}`;
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

  // ===== 顶部按钮：按你的要求改文案 & 改逻辑 =====
  // 你要求：
  // - “复制AttemptId”删掉
  // - “刷新”删掉，改成“邀请微信好友一起免费测试”
  // - “复制报告链接”改成“复制考试链接”
  // 为了不改 HTML（保留结构/ID/大逻辑），这里直接“隐藏/复用”原按钮。

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

