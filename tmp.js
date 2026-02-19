const url = 'https://rrb.digialm.com/per/g22/pub/33015/touchstone/AssessmentQPHTMLMode1/33015O25138/33015O25138S74D3056/1764939039456939/1882441200697158_33015O25138S74D3056E1.html';
(async () => {
  const res = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0' } });
  const html = await res.text();
  const idx = html.indexOf('<div class="question-pnl"');
  console.log('idx', idx);
  console.log(html.slice(idx, idx + 1400));
})();
