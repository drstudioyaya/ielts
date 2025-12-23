async function main() {
  // 关键：相对路径从 score.html 所在目录出发
  const res = await fetch("./data/scoreResponse.v1.example.json");
  if (!res.ok) {
    throw new Error(`JSON加载失败: ${res.status} ${res.statusText}`);
  }
  const data = await res.json();

  // Overall
  const overallEl = document.getElementById("overall");
  overallEl.innerHTML = `
    <p>正确：${data.overall.rawCorrect}/${data.overall.rawTotal}</p>
    <p>Band：${data.overall.band}（${data.overall.cefr}）</p>
    <p>用时：${Math.round(data.overall.timeSpentSec / 60)} 分钟</p>
    <p>一句话：${data.overall.headlineCn}</p>
  `;

  // Sections
  const sectionsEl = document.getElementById("sections");
  sectionsEl.innerHTML = data.sections.map(s => `
    <div style="margin: 8px 0; padding: 8px; border: 1px solid #ddd;">
      <strong>Section ${s.section}</strong><br/>
      正确：${s.rawCorrect}/${s.rawTotal} ｜ 用时：${Math.round(s.timeSpentSec/60)} 分钟<br/>
      Top错误标签：${(s.topErrorLabels || []).join(", ")}
    </div>
  `).join("");

  // Evidence Snapshot
  const evidenceEl = document.getElementById("evidence");
  evidenceEl.innerHTML = (data.evidenceSnapshot || []).map(e => `
    <div style="margin: 8px 0; padding: 8px; border: 1px solid #ddd;">
      <strong>${e.titleCn}</strong><br/>
      ${e.questionRange} ｜ ${e.questionType} ｜ ${e.errorLabel}<br/>
      <p>${e.whatHappenedCn}</p>
      <p><em>${e.fixCn}</em></p>
    </div>
  `).join("");
}

main().catch(err => {
  document.body.innerHTML = `<pre style="color:red;">${err.stack}</pre>`;
});
