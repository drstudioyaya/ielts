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

  function renderError(message, raw) {
    const app = $("#app");
    app.innerHTML = `
      <div class="card">
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

    // 基础 sections（旧字段）
    const sections = Array.isArray(data?.sections) ? data.sections : [];

    // 增强 sections（新字段：sectionsEnhanced）
    const sectionsEnhanced = Array.isArray(data?.sectionsEnhanced) ? data.sectionsEnhanced : null;

    // Band table（新字段：bandTable）
    const bandTable = Array.isArray(data?.bandTable) ? data.bandTable : [];

    // paywall
    const paywall = data?.paywall || {};
    const locked = Array.isArray(paywall.locked) ? paywall.locked : [];
    const freeVisible = Array.isArray(paywall.freeVisible) ? paywall.freeVisible : [];

    // --- helpers for module 3 notes ---
    const secMap = {};
    sections.forEach((s) => {
      const k = String(s.section || "");
      secMap[k] = {
        rawCorrect: Number(s.rawCorrect ?? 0),
        rawTotal: Number(s.rawTotal ?? 0),
      };
    });

    function getSecScore(secId) {
      const hit = secMap[String(secId)];
      if (!hit) return { c: 0, t: 10, p: 0 };
      const c = Number(hit.rawCorrect || 0);
      const t = Number(hit.rawTotal || 0);
      return { c, t, p: pct(c, t) };
    }

    // --- Module 0 (emotional hook) ---
    const module0 = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>你现在最该做的，不是刷更多题</h2>
        <div class="muted" style="margin-top:6px; line-height:1.8;">
          <div>这份报告会把你在 Listening 的失分，拆成「可修复的具体点」。</div>
          <div>你不用靠运气提升分数：先把最影响分数的 1–2 个短板修掉。</div>
          <div>接下来你会看到：总览 → Band 换算 → 分 Section →（可解锁）能力画像 / 证据快照 / 行动计划。</div>
        </div>
        <div class="hr"></div>
        <div class="muted">AttemptId：<b>${esc(attemptId)}</b>｜数据来源：/api/report（后端复算）</div>
      </div>
    `;

    // --- Module 1: overall card (existing) ---
    const module1 = `
      <div class="card">
        <h2>模块1｜考试结果总览</h2>
        <div class="bigScore">${esc(rawCorrect)} / ${esc(rawTotal)}</div>
        <div class="muted">正确率：${esc(overallPct)}%</div>
        <div class="bar"><div style="width:${overallPct}%"></div></div>
        <div class="kv">
          <span class="pill">Band: <b>${esc(overall.band ?? "—")}</b></span>
          <span class="pill">CEFR: <b>${esc(overall.cefr ?? "NA")}</b></span>
          <span class="pill">Time: <b>${esc(overall.timeSpentSec ?? 0)}s</b></span>
        </div>
        <div class="hr"></div>
        <div><b>一句话：</b><span class="muted">${esc(headlineCn)}</span></div>
        <div class="muted" style="margin-top:8px;">评分规则在「附录A」可查看。</div>
      </div>
    `;

    // --- Section cards (existing) ---
    const sectionCards = sections.length
      ? sections
          .filter((s) => String(s.section || "") !== "full")
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
      : `<div class="muted">暂无分 Section 数据（例如 mock 报告会是空的，这是正常的）。</div>`;

    // --- Module 3: section analysis with short notes ---
    const s1 = getSecScore("1");
    const s2 = getSecScore("2");
    const s3 = getSecScore("3");
    const s4 = getSecScore("4");

    const module3 = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>模块3｜Section 1–4 表现分析</h2>
        <div class="muted" style="margin-top:4px;">（先用“可读解释 + 分数”上线，后续再接入更细的错因分析）</div>
        <div class="hr"></div>

        <div class="sectionItem">
          <div class="sectionLeft">
            <div class="sectionTitle">Section 1</div>
            <div class="sectionMeta">${esc(s1.c)} / ${esc(s1.t)}（${esc(s1.p)}%）</div>
            <div class="muted" style="margin-top:4px;">通常考：信息定位 + 拼写/数字。</div>
          </div>
          <div style="min-width:160px; flex:0 0 160px;">
            <div class="bar"><div style="width:${s1.p}%"></div></div>
          </div>
        </div>

        <div class="sectionItem">
          <div class="sectionLeft">
            <div class="sectionTitle">Section 2</div>
            <div class="sectionMeta">${esc(s2.c)} / ${esc(s2.t)}（${esc(s2.p)}%）</div>
            <div class="muted" style="margin-top:4px;">通常考：地图/流程 + 同义替换。</div>
          </div>
          <div style="min-width:160px; flex:0 0 160px;">
            <div class="bar"><div style="width:${s2.p}%"></div></div>
          </div>
        </div>

        <div class="sectionItem">
          <div class="sectionLeft">
            <div class="sectionTitle">Section 3</div>
            <div class="sectionMeta">${esc(s3.c)} / ${esc(s3.t)}（${esc(s3.p)}%）</div>
            <div class="muted" style="margin-top:4px;">通常考：多人对话 + 干扰项。</div>
          </div>
          <div style="min-width:160px; flex:0 0 160px;">
            <div class="bar"><div style="width:${s3.p}%"></div></div>
          </div>
        </div>

        <div class="sectionItem" style="margin-bottom:0;">
          <div class="sectionLeft">
            <div class="sectionTitle">Section 4</div>
            <div class="sectionMeta">${esc(s4.c)} / ${esc(s4.t)}（${esc(s4.p)}%）</div>
            <div class="muted" style="margin-top:4px;">通常考：学术讲座 + 结构信号词。</div>
          </div>
          <div style="min-width:160px; flex:0 0 160px;">
            <div class="bar"><div style="width:${s4.p}%"></div></div>
          </div>
        </div>

        <div class="hr"></div>
        <div><b>Report note：</b><span class="muted">下一步优先顺序：先修复失分最多的 Section，再补其他部分（解锁后会给到具体错因与训练动作）。</span></div>
      </div>
    `;

    // --- Module 2: band table as “strict display panel” ---
    const bandRows = bandTable.length
      ? bandTable
          .map((r) => {
            const raw = esc(r.raw ?? "");
            const b = esc(r.band ?? "");
            const isMe =
              typeof r.raw === "string" &&
              (rawCorrect >= Number(String(r.raw).split("–")[0] || 9999)) &&
              (rawCorrect <= Number(String(r.raw).split("–")[1] || -9999));
            return `
              <div class="sectionItem" style="margin-top:8px; ${isMe ? "border:1px solid rgba(0,0,0,0.12);" : ""}">
                <div class="sectionLeft">
                  <div class="sectionTitle">Raw ${raw}</div>
                </div>
                <div style="min-width:80px; text-align:right; font-weight:800;">${b}</div>
              </div>
            `;
          })
          .join("")
      : `<div class="muted">暂无 Band 对照表数据（你可以先保持隐藏或稍后补上）。</div>`;

    const module2 = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>模块2｜Band Score 换算（Raw → Band）</h2>
        <div class="muted" style="margin-top:6px;">
          说明：Listening Band 与 Raw Score 的对应关系按常用官方换算表展示（不同场次可能有微调）。
        </div>
        <div class="hr"></div>
        <div class="muted">你的 Raw Score：<b>${esc(rawCorrect)}</b> → 预估 Band：<b>${esc(overall.band ?? "—")}</b></div>
        <div style="margin-top:10px;">${bandRows}</div>
      </div>
    `;

    // --- Module 4/4.5/5/6: preview placeholders (minimum launch) ---
    const module4 = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>模块4｜Listening Skills Profile（12维能力画像）</h2>
        <div class="muted" style="margin-top:6px;">
          你将看到 12 个核心能力维度的强弱分布（如：同义替换识别、信息定位、数字拼写、干扰项抗性等）。
        </div>
        <div class="hr"></div>
        <div class="muted">
          当前为预览版：解锁后展示完整能力条 + 你的关键短板 Top 3。
        </div>
      </div>
    `;

    const module45 = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>模块4.5｜Evidence Snapshot（证据快照）</h2>
        <div class="muted" style="margin-top:6px;">
          我们不会只给“结论”，还会给“证据”。解锁后你会看到每一类错因对应的证据快照（你的答案 vs 标准答案 vs 规则）。
        </div>
        <div class="hr"></div>
        <div class="muted">
          示例（占位）：
          <ul style="margin:8px 0 0 18px;">
            <li>字数限制导致 0 分（例如：题干要求 ONE WORD，但输入了 two words）</li>
            <li>同义替换未识别 → 定位错行</li>
            <li>选择题被干扰项带走 → 选了“听到的词”而不是“问题要的”</li>
          </ul>
        </div>
      </div>
    `;

    const module5 = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>模块5｜你的关键短板结论（解锁后生成）</h2>
        <div class="muted" style="margin-top:6px;">
          你将获得：1句总诊断 + 3个关键短板 + 每个短板的根因解释（带证据）。
        </div>
        <div class="hr"></div>
        <div class="muted">
          示例（占位）：
          <ul style="margin:8px 0 0 18px;">
            <li>短板1：同义替换识别不足 → 导致定位错行</li>
            <li>短板2：数字/日期格式不稳定 → 明明听对却丢分</li>
            <li>短板3：干扰项抗性弱 → 选择题容易被误导</li>
          </ul>
        </div>
      </div>
    `;

    const module6 = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>模块6｜7/14 天可执行训练计划（解锁后生成）</h2>
        <div class="muted" style="margin-top:6px;">今天就能做（3选1）：</div>
        <div class="muted">
          <ol style="margin:8px 0 0 18px;">
            <li><b>数字/日期快练 8 分钟</b>：只练时间、日期、数字连读（正确率&gt;90%再加速）</li>
            <li><b>同义替换 10 分钟</b>：把题干关键词换写 3 个同义表达</li>
            <li><b>干扰项对抗 1 组题</b>：做完必须写“我为什么选错”（一句话）</li>
          </ol>
        </div>
        <div class="hr"></div>
        <div class="muted">解锁后：Top3短板 → Today Action + 7天计划 + 14天强化计划 + 课程入口。</div>
      </div>
    `;

    // --- Module 7: paywall CTA card (keep your existing buttons) ---
    const module7 = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>模块7｜解锁完整版诊断（Premium）</h2>
        <div class="muted" style="margin-top:6px;">
          解锁后你将获得：
          <ul style="margin:8px 0 0 18px;">
            <li>✅ 12维能力画像（强弱分布 + Top3短板）</li>
            <li>✅ 高频错因标签（你最常见的失分模式）</li>
            <li>✅ Evidence Snapshot（每类错因的证据快照）</li>
            <li>✅ 7/14天行动计划（可直接照做）</li>
            <li>✅ 课程/训练入口（按短板匹配）</li>
          </ul>
        </div>
        <div class="hr"></div>
        <div class="row">
          <a class="btn primary" href="/pricing" style="text-decoration:none;">解锁完整诊断（付费）</a>
          <a class="btn" href="./full.html" style="text-decoration:none;">再做一次 Full Test</a>
        </div>
      </div>
    `;

    // --- Appendix A/B/C as collapsible panels ---
    const appendixA = `
      <details style="margin-top:12px;">
        <summary><b>附录A｜评分规则与判分口径</b></summary>
        <div class="muted" style="margin-top:10px; line-height:1.9;">
          <div><b>判分口径：</b>大小写不敏感；去除首尾多余标点；货币符号忽略；按题干字数限制严格判分。</div>
          <div><b>字数限制：</b>超过题干要求的词数/格式，按 IELTS 规则记 0 分。</div>
          <div><b>日期/时间：</b>常见格式可接受（例如 8:30 / 8.30；7/14 / 14/7 / 7-14 等，按题库与 normalize 规则）。</div>
          <div class="muted" style="margin-top:8px;">（你后续可以把更“官方”的口径文案替换到这里，不影响整体结构。）</div>
        </div>
      </details>
    `;

    const appendixB = `
      <details style="margin-top:10px;" ${bandTable.length ? "" : "open"}>
        <summary><b>附录B｜Band 对照表（Raw → Band）</b></summary>
        <div style="margin-top:10px;">
          ${bandTable.length ? bandRows : `<div class="muted">暂无 Band 对照表数据。</div>`}
        </div>
      </details>
    `;

    const appendixC = `
      <details style="margin-top:10px;">
        <summary><b>附录C｜原始数据（调试用）</b></summary>
        <div style="margin-top:10px;">
          <div class="muted">version：<b>${esc(data?.version ?? "—")}</b></div>
          <div class="muted">attemptId：<b>${esc(attemptId)}</b></div>
          <div class="hr"></div>
          <pre>${esc(JSON.stringify(data, null, 2))}</pre>
        </div>
      </details>
    `;

    // --- extra: “share & review” (keep your existing button area idea) ---
    const shareCard = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>分享与复盘</h2>
        <div class="muted">你可以复制报告链接发给老师/同学，或自己保存复盘。</div>
        <div class="hr"></div>
        <div class="row">
          <button class="btn" id="copyAttemptBtn2">复制 AttemptId</button>
          <button class="btn" id="copyLinkBtn2">复制报告链接</button>
          <button class="btn" id="refreshBtn2">刷新</button>
        </div>
      </div>
    `;

    // --- “diagnostic preview” card (show paywall info as you have now) ---
    const diagnosticPreviewCard = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>诊断总览（预览）</h2>
        <div class="muted">这里未来会显示：12维能力雷达 / 高频错因类型 / 关键证据句（现在先把模块占位搭起来）。</div>
        <div style="margin-top:10px;" class="muted">当前免费可见：<b>${esc(freeVisible.join(", ") || "—")}</b></div>
        <div class="muted" style="margin-top:6px;">当前锁定：<b>${esc(locked.join(", ") || "—")}</b></div>
      </div>
    `;

    // Layout: 0 card full width; then 1 & section cards in two columns; then modules full width
    app.className = "grid two";
    app.innerHTML = `
      ${module0}

      ${module1}

      <div class="card">
        <h2>分 Section</h2>
        ${sectionCards}
      </div>

      ${module2}
      ${module3}

      ${diagnosticPreviewCard}
      ${module4}
      ${module45}
      ${module5}
      ${module6}
      ${module7}
      ${shareCard}

      <div class="card" style="grid-column: 1 / -1;">
        <h2>附录（可折叠）</h2>
        ${appendixA}
        ${appendixB}
        ${appendixC}
      </div>
    `;

    // 填充顶部 attemptId
    const pill = $("#attemptIdPill");
    if (pill) pill.textContent = attemptId;

    // 绑定 shareCard 的按钮（不影响顶部按钮）
    const bindCopy = async (text, okMsg) => {
      try { await navigator.clipboard.writeText(text); } catch {}
      alert(okMsg);
    };
    const aId = getAttemptId();

    const b1 = $("#copyAttemptBtn2");
    if (b1) b1.onclick = () => aId && bindCopy(aId, "已复制 AttemptId");

    const b2 = $("#copyLinkBtn2");
    if (b2) b2.onclick = () => bindCopy(location.href, "已复制报告链接");

    const b3 = $("#refreshBtn2");
    if (b3) b3.onclick = () => location.reload();
  }

  async function load() {
    const attemptId = getAttemptId();
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

  // 顶部按钮（保留你原有逻辑）
  const copyAttemptBtn = $("#copyAttemptBtn");
  if (copyAttemptBtn) {
    copyAttemptBtn.onclick = async () => {
      const attemptId = getAttemptId();
      if (!attemptId) return;
      try { await navigator.clipboard.writeText(attemptId); } catch {}
      alert("已复制 AttemptId");
    };
  }

  const copyLinkBtn = $("#copyLinkBtn");
  if (copyLinkBtn) {
    copyLinkBtn.onclick = async () => {
      try { await navigator.clipboard.writeText(location.href); } catch {}
      alert("已复制报告链接");
    };
  }

  const refreshBtn = $("#refreshBtn");
  if (refreshBtn) {
    refreshBtn.onclick = () => location.reload();
  }

  load();
})();
