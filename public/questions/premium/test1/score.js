(async function () {
  const params = new URLSearchParams(location.search);
  const attemptId = params.get("attemptId") || "mock";

  const res = await fetch(`/api/report?attemptId=${encodeURIComponent(attemptId)}`);
  const data = await res.json();

  document.getElementById("app").innerHTML = `
    <p><b>AttemptId:</b> ${data.attemptId}</p>
    <p><b>Band:</b> ${data.overall.band}</p>
    <p><b>正确:</b> ${data.overall.rawCorrect}/${data.overall.rawTotal}</p>
    <p><b>一句话:</b> ${data.overall.headlineCn}</p>
  `;
})();
