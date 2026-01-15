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

  // ---------- 附录B：Band Table ----------
  function parseRangeText(rangeText) {
    const nums = String(rangeText || "").match(/\d+/g);
    if (!nums || nums.length === 0) return null;
    const a = Number(nums[0]);
    const b = Number(nums[1] ?? nums[0]);
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    return { min: Math.min(a, b), max: Math.max(a, b) };
  }

  function renderBandTableRows(bandTable, rawCorrect) {
    if (!Array.isArray(bandTable) || bandTable.length === 0) {
      return `<div class="muted">（暂无 bandTable 数据：你可以先不管，后端返回了就会自动显示）</div>`;
    }

    const score = Number(rawCorrect ?? 0);

    return bandTable
      .map((row) => {
        const raw = row?.raw ?? "";
        const band = row?.band ?? "";
        const range = parseRangeText(raw);
        const hit = range ? score >= range.min && score <= range.max : false;

        return `
          <div style="
            display:flex; align-items:center; justify-content:space-between;
            padding:8px 10px; border:1px solid #eee; border-radius:10px; margin-top:8px;
            ${hit ? "background:#f3f4f6; border-color:#d1d5db; font-weight:800;" : ""}
          ">
            <div class="muted" style="${hit ? "color:#111;" : ""}">Raw ${esc(raw)}</div>
            <div style="min-width:52px; text-align:right;">${esc(band)}</div>
          </div>
        `;
      })
      .join("");
  }

  // ---------- 分Section（优先 sectionsEnhanced） ----------
  function renderSectionCards(data) {
    const sectionsEnhanced = Array.isArray(data?.sectionsEnhanced) ? data.sectionsEnhanced : [];
    const sections = Array.isArray(data?.sections) ? data.sections : [];
    const list = sectionsEnhanced.length ? sectionsEnhanced : sections;

    if (!list.length) {
      return `<div class="muted">暂无分 Section 数据（mock 报告为空是正常的）。</div>`;
    }

    return list
      .map((s) => {
        const secId = String(s.section || "");
        const sc = Number(s.rawCorrect ?? 0);
        const st = Number(s.rawTotal ?? 0);
        const sp =
          typeof s.accuracy === "number"
            ? Math.max(0, Math.min(100, Math.round(s.accuracy)))
            : pct(sc, st);

        const topErrorLabels = Array.isArray(s.topErrorLabels) ? s.topErrorLabels : [];
        const note = String(s.note || "").trim();

        const extra =
          topErrorLabels.length || note
            ? `
              <div class="small" style="margin-top:6px;">
                ${topErrorLabels.length ? `<div><b>Top errors:</b> ${esc(topErrorLabels.join(", "))}</div>` : ""}
                ${note ? `<div style="margin-top:4px;"><b>Note:</b> ${esc(note)}</div>` : ""}
              </div>
            `
            : "";

        return `
          <div class="sectionItem">
            <div class="sectionLeft">
              <div class="sectionTitle">${esc(sectionLabel(secId))}</div>
              <div class="sectionMeta">${esc(sc)} / ${esc(st)}（${esc(sp)}%）</div>
              ${extra}
            </div>
            <div style="min-width:140px; flex:0 0 140px;">
              <div class="bar"><div style="width:${sp}%"></div></div>
            </div>
          </div>
        `;
      })
      .join("");
  }

  // ---------- ✅ 模块0-7 + 附录A/B/C ----------
  function renderReport(data, attemptId) {
    const app = $("#app");

    const overall = data?.overall || {};
    const rawCorrect = Number(overall.rawCorrect ?? 0);
    const rawTotal = Number(overall.rawTotal ?? 0);
    const overallPct = pct(rawCorrect, rawTotal);

    const paywall = data?.paywall || {};
    const locked = Array.isArray(paywall.locked) ? paywall.locked : [];
    const freeVisible = Array.isArray(paywall.freeVisible) ? paywall.freeVisible : [];

    const bandTable = Array.isArray(data?.bandTable) ? data.bandTable : [];

    // ========== 模块 0：页头摘要（Hero） ==========
    const mod0 = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>你的评分报告</h2>
        <div class="muted">AttemptId：<b>${esc(attemptId)}</b></div>
        <div class="small" style="margin-top:6px;">本页数据来自 /api/report（后端复算）。</div>
      </div>
    `;

    // ========== 模块 1：总分卡 ==========
    const headlineCn = String(overall.headlineCn || "").trim();
    const mod1 = `
      <div class="card">
        <h2>总分</h2>
        <div class="bigScore">${esc(rawCorrect)} / ${esc(rawTotal)}</div>
        <div class="muted">正确率：${esc(overallPct)}%</div>
        <div class="bar"><div style="width:${overallPct}%"></div></div>
        <div class="kv">
          <span class="pill">Band: <b>${esc(overall.band ?? "—")}</b></span>
          <span class="pill">CEFR: <b>${esc(overall.cefr ?? "NA")}</b></span>
          <span class="pill">Time: <b>${esc(overall.timeSpentSec ?? 0)}s</b></span>
        </div>
        <div class="hr"></div>
        <div><b>一句话：</b><span class="muted">${esc(headlineCn || "—")}</span></div>
      </div>
    `;

    // ========== 模块 2：分Section ==========
    const mod2 = `
      <div class="card">
        <h2>分 Section</h2>
        ${renderSectionCards(data)}
      </div>
    `;

    // ========== 模块 3：诊断总览（先排版，不追求算法） ==========
    // 这里你未来会把 dimensions / errorLabels / evidenceSnapshot 渲染进来
    const mod3 = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>诊断总览（预览）</h2>
        <div class="muted">
          这里未来会显示：12维能力雷达 / 高频错误类型 / 关键证据句（现在先把模块占位搭起来）。
        </div>
        <div class="small" style="margin-top:10px;">
          当前免费可见：${esc(freeVisible.join(", ") || "—")} <br/>
          当前锁定：${esc(locked.join(", ") || "—")}
        </div>
      </div>
    `;

    // ========== 模块 4：行动计划（预览） ==========
    const mod4 = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>行动计划（预览）</h2>
        <div class="muted">
          这里未来会给你：今天就能做的 3 个动作 + 7 天训练安排 + 对应题型的纠错方法（先占位）。
        </div>
      </div>
    `;

    // ========== 模块 5：付费解锁 CTA ==========
    const mod5 = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>解锁完整报告</h2>
        <div class="muted">
          解锁后可见：12维完整诊断 + 全量错误标签 + 证据句 + 个性化行动计划。
        </div>
        <div class="hr"></div>
        <div class="row">
          <a class="btn primary" href="/pricing" style="text-decoration:none;">解锁完整诊断（付费）</a>
          <a class="btn" href="./full.html" style="text-decoration:none;">再做一次 Full Test</a>
        </div>
      </div>
    `;

    // ========== 模块 6：分享/复盘 ==========
    const mod6 = `
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

    // ========== 模块 7：附录A/B/C（折叠面板） ==========
    const mod7 = `
      <div class="card" style="grid-column: 1 / -1;">
        <h2>附录（可折叠）</h2>

        <!-- 附录A：评分规则说明（先排版，后面你可换成更完整文案） -->
        <details style="margin-top:10px;">
          <summary><b>附录 A｜评分规则与判分口径</b></summary>
          <div class="small" style="margin-top:10px; line-height:1.7;">
            <div><b>判分口径：</b>大小写不敏感；去除首尾多余标点；货币符号忽略；按题干字数限制严格判分。</div>
            <div style="margin-top:6px;"><b>字数限制：</b>超过题干要求的词数/格式，按 IELTS 规则记 0 分。</div>
            <div style="margin-top:6px;"><b>日期/时间：</b>常见格式可接受（例如 8:30 / 8.30；7/14 / 14/7 / 7-14 等，按你题库与 normalize 规则）。</div>
            <div style="margin-top:10px;" class="muted">（你后续可以把“官方口径文案”替换到这里，不影响整体结构。）</div>
          </div>
        </details>

        <!-- 附录B：Band 对照表 -->
        <details style="margin-top:10px;">
          <summary><b>附录 B｜Band 对照表（Raw → Band）</b></summary>
          <div style="margin-top:10px;">
            ${renderBandTableRows(bandTable, rawCorrect)}
          </div>
        </details>

        <!-- 附录C：调试与原始数据 -->
        <details style="margin-top:10px;">
          <summary><b>附录 C｜原始数据（调试用）</b></summary>
          <div class="small" style="margin-top:10px;">
            <div><b>version：</b>${esc(data?.version || "—")}</div>
            <div><b>attemptId：</b>${esc(attemptId)}</div>
            <div style="margin-top:10px;">
              <details>
                <summary>查看原始 JSON</summary>
                <pre>${esc(JSON.stringify(data, null, 2))}</pre>
              </details>
            </div>
          </div>
        </details>
      </div>
    `;

    // ---- 页面拼装：0-7 ----
    app.className = "grid two";
    app.innerHTML = `
      ${mod0}
      ${mod1}
      ${mod2}
      ${mod3}
      ${mod4}
      ${mod5}
      ${mod6}
      ${mod7}
    `;

    // 顶部 attemptId pill
    const pill = $("#attemptIdPill");
    if (pill) pill.textContent = attemptId;

    // 复用按钮（模块6里的）
    const bindCopy = async (text, tip) => {
      try { await navigator.clipboard.writeText(text); } catch {}
      alert(tip);
    };
    const btnA = $("#copyAttemptBtn2");
    const btnL = $("#copyLinkBtn2");
    const btnR = $("#refreshBtn2");
    if (btnA) btnA.onclick = () => bindCopy(attemptId, "已复制 AttemptId");
    if (btnL) btnL.onclick = () => bindCopy(location.href, "已复制报告链接");
    if (btnR) btnR.onclick = () => location.reload();
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
      try { data = JSON.parse(text); } catch { data = null; }

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

  // 顶部按钮（保持你原本的）
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
  if (refreshBtn) refreshBtn.onclick = () => location.reload();

  load();
})();
