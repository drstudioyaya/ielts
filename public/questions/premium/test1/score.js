(async function () {
  const app = document.getElementById("app");
  app.innerHTML = "加载中...";

  try {
    const params = new URLSearchParams(location.search);
    const attemptId = params.get("attemptId") || "mock";

    const url = `/api/report?attemptId=${encodeURIComponent(attemptId)}&t=${Date.now()}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API ${res.status}: ${text}`);
    }

    const data = await res.json();

    app.innerHTML = `
      <p><b>AttemptId:</b> ${data.attemptId}</p>
      <p><b>Band:</b> ${data.overall?.band ?? "-"}</p>
      <p><b>正确:</b> ${data.overall?.rawCorrect ?? 0}/${data.overall?.rawTotal ?? 40}</p>
      <p><b>一句话:</b> ${data.overall?.headlineCn ?? ""}</p>
      <pre style="white-space:pre-wrap;background:#f6f6f6;padding:12px;border-radius:8px;">${JSON.stringify(data, null, 2)}</pre>
    `;
  } catch (e) {
    app.innerHTML = `<p style="color:#c00;"><b>加载失败：</b>${e.message}</p>`;
    console.error(e);
  }
})();
