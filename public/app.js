const stageNames = ['planner', 'payment-domain', 'security-compliance', 'reliability', 'test-design', 'synthesis'];
const form = document.querySelector('#review-form');
const scenario = document.querySelector('#scenario');
const status = document.querySelector('#status');
const stages = document.querySelector('#stages');
const results = document.querySelector('#results');
const button = form.querySelector('button');

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[character]));

function setStageState(activeIndex, completed = false) {
  stages.innerHTML = stageNames.map((name, index) => {
    const state = completed || index < activeIndex ? 'done' : index === activeIndex ? 'active' : '';
    return `<span class="stage ${state}">${name}</span>`;
  }).join('');
}

function list(items) {
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function render(data) {
  const review = data.review;
  results.innerHTML = `
    <section class="result wide"><h2>Summary</h2><p>${escapeHtml(review.summary)}</p></section>
    <section class="result"><h2>Strengths</h2>${list(review.strengths)}</section>
    <section class="result"><h2>Risks</h2>${list(review.risks)}</section>
    <section class="result"><h2>Test cases</h2>${list(review.testCases)}</section>
    <section class="result wide"><h2>Human review gate</h2>${list(review.humanReview)}</section>`;
  results.hidden = false;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  button.disabled = true;
  results.hidden = true;
  setStageState(0);
  status.textContent = 'Running specialist agents...';
  try {
    const response = await fetch('/api/review', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ scenario: scenario.value.trim() })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Review failed');
    setStageState(stageNames.length, true);
    render(data);
    status.textContent = `Review complete using ${data.model}. Validate the recommendations with a qualified engineer.`;
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Review failed';
    setStageState(0);
  } finally {
    button.disabled = false;
  }
});

setStageState(-1);
