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

    const sections = Array.isArray(data?.sections) ? data.sections : [];
    // sections 可能只有 full，也可能有 1-4，也可能为空（mock）
    const sectionCards = sections.length
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
      : `<div class="muted">暂无分 Section 数据（例如 mock 报告会是空的，这是正常的）。</div>`;

    const paywall = data?.paywall || {};
    const locked = Array.isArray(paywall.locked) ? paywall.locked : [];
    const freeVisible = Array.isArray(paywall.freeVisible) ? paywall.freeVisible : [];

    app.className = "grid two";
    app.innerHTML = `
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
        <div><b>一句话：</b><span class="muted">${esc(headlineCn)}</span></div>
      </div>

      <div class="card">
        <h2>分 Section</h2>
        ${sectionCards}
      </div>

      <div class="card" style="grid-column: 1 / -1;">
        <h2>可见内容 / 解锁内容</h2>
        <div class="muted">当前免费可见：${esc(freeVisible.join(", ") || "—")}</div>
        <div class="muted" style="margin-top:6px;">当前锁定：${esc(locked.join(", ") || "—")}</div>
        <div class="hr"></div>
        <div class="row">
          <a class="btn primary" href="/pricing" style="text-decoration:none;">解锁完整诊断（付费）</a>
          <a class="btn" href="./full.html" style="text-decoration:none;">再做一次 Full Test</a>
        </div>

        <details style="margin-top:14px;">
          <summary>查看原始 JSON（调试用）</summary>
          <pre>${esc(JSON.stringify(data, null, 2))}</pre>
        </details>
      </div>
    `;

    // 填充顶部 attemptId
    $("#attemptIdPill").textContent = attemptId;
  }

  async function load() {
    const attemptId = getAttemptId();
    $("#attemptIdPill").textContent = attemptId || "—";

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

  // 顶部按钮
  $("#copyAttemptBtn").onclick = async () => {
    const attemptId = getAttemptId();
    if (!attemptId) return;
    try { await navigator.clipboard.writeText(attemptId); } catch {}
    alert("已复制 AttemptId");
  };

  $("#copyLinkBtn").onclick = async () => {
    try { await navigator.clipboard.writeText(location.href); } catch {}
    alert("已复制报告链接");
  };

  $("#refreshBtn").onclick = () => location.reload();

  load();
})();
