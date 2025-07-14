// Handles chapter selection from dropdown
function changeChapter() {
  const select = document.getElementById('chapterSelect');
  const selected = select.value;
  if (selected !== currentChapter) {
    currentChapter = selected;
    // Reset loaded data so new chapter's data is fetched
    questionsData = null;
    mindmapData = null;
    flashcardsData = null;
    // Reload the current section
    showSection(currentSection);
  }
}
// Path to the questions.json file
const QUESTIONS_PATH = 'questions.json';

let currentChapter = '101';
let questionsData = null;
let mindmapData = null;
let flashcardsData = null;
let exercisesData = null;
let ttsUtter = null;
let ttsIsSpeaking = false;
let currentSection = 'mindmap';

function getChapterPath(filename) {
  return `../chapters/chapter${currentChapter}/${filename}`;
}

async function loadQuestions(type) {
  if (!questionsData) {
    questionsData = await fetch(getChapterPath('questions.json')).then(r => r.json());
  }
  const container = document.getElementById('content');
  container.innerHTML = '';
  // DEBUG: Log the number of questions loaded for this type
  console.log('DEBUG: questionsData[', type, '] length =', questionsData[type] ? questionsData[type].length : 'undefined');
  if (!questionsData[type] || questionsData[type].length === 0) {
    container.innerHTML = '<p>No questions available for this type.</p>';
    return;
  }
  // DEBUG: Log the first 20 questions for inspection
  console.log('DEBUG: questionsData[', type, ']:', questionsData[type]);
  questionsData[type].forEach((q, idx) => {
    // DEBUG: Log each question
    console.log('DEBUG: Q', idx+1, q.question);
    const block = document.createElement('div');
    block.className = 'question-block';
    let html = '';
    if (type === 'mcq') {
      html += `<b>Q${idx+1}:</b> ${q.question}<div class='options'>`;
      q.options.forEach((opt, i) => {
        html += `<div><input type='radio' name='mcq${idx}' value='${i}'> ${opt}</div>`;
      });
      html += '</div>';
      html += `<button class='check-btn' id='check${idx}' style='margin-top:8px;'>Check</button>`;
      html += `<div class='mcq-feedback' id='feedback${idx}' style='margin-top:8px;'></div>`;
      // Remove always-visible explanation; only show in feedback after checking
    } else if (type === 'one_word' || type === 'short_answer' || type === 'long_answer' || type === 'case_study') {
      html += `<b>Q${idx+1}:</b> ${q.question}`;
      let answerHtml = q.answer
        .split(/\n{2,}/g).map((para) => {
          let lines = para.split(/\n/).filter(Boolean);
          if (lines.length > 1) {
            return '<ul style="margin:0 0 0 18px;padding:0;">' +
              lines.map(line => `<li>${line.trim().replace(/^[-\d.]+\s*/, '')}</li>`).join('') +
              '</ul>';
          } else {
            return para;
          }
        }).join('<br><br>');
      html += `<div class='explanation'><b>Answer:</b> ${answerHtml} <button class='tts-btn' title='Listen Answer' data-tts-bullets='${encodeURIComponent(q.answer)}'>🔊</button></div>`;
    } else if (type === 'assertion_reason') {
      html += `<b>Q${idx+1}:</b> <b>Assertion:</b> ${q.assertion}<br><b>Reason:</b> ${q.reason}<div class='options'>`;
      q.options.forEach((opt, i) => {
        html += `<div><input type='radio' name='ar${idx}' value='${i}'> ${opt}</div>`;
      });
      html += '</div>';
    }
    block.innerHTML = html;
    container.appendChild(block);
    // Add MCQ validation logic
    if (type === 'mcq') {
      const checkBtn = block.querySelector(`#check${idx}`);
      const feedbackDiv = block.querySelector(`#feedback${idx}`);
      checkBtn.onclick = () => {
        const selected = block.querySelector(`input[name='mcq${idx}']:checked`);
        if (!selected) {
          feedbackDiv.innerHTML = `<span style='color:#fc575e;'>Please select an option.</span>`;
          return;
        }
        const answerIdx = parseInt(selected.value);
        let feedbackHtml = '';
        if (answerIdx === q.answer) {
          feedbackHtml = `<span style='color:green;'>Correct!</span>`;
        } else {
          feedbackHtml = `<span style='color:#fc575e;'>Incorrect. Correct answer: <b>${q.options[q.answer]}</b></span>`;
        }
        if (q.explanation) {
          feedbackHtml += `<div class='explanation' style='margin-top:4px;'><b>Explanation:</b> ${q.explanation}</div>`;
        }
        feedbackDiv.innerHTML = feedbackHtml;
      };
    }
    // Add assertion-reason validation logic
    if (type === 'assertion_reason') {
      const options = block.querySelectorAll(`input[name='ar${idx}']`);
      const feedbackDiv = document.createElement('div');
      feedbackDiv.className = 'ar-feedback';
      feedbackDiv.style.marginTop = '8px';
      block.appendChild(feedbackDiv);
      const checkBtn = document.createElement('button');
      checkBtn.className = 'check-btn';
      checkBtn.textContent = 'Check';
      checkBtn.style.marginTop = '8px';
      block.appendChild(checkBtn);
      checkBtn.onclick = () => {
        const selected = block.querySelector(`input[name='ar${idx}']:checked`);
        if (!selected) {
          feedbackDiv.innerHTML = `<span style='color:#fc575e;'>Please select an option.</span>`;
          return;
        }
        const answerIdx = parseInt(selected.value);
        let feedbackHtml = '';
        if (answerIdx === q.answer) {
          feedbackHtml = `<span style='color:green;'>Correct!</span>`;
        } else {
          feedbackHtml = `<span style='color:#fc575e;'>Incorrect. Correct answer: <b>${q.options[q.answer]}</b></span>`;
        }
        if (q.explanation) {
          feedbackHtml += `<div class='explanation' style='margin-top:4px;'><b>Explanation:</b> ${q.explanation}</div>`;
        }
        feedbackDiv.innerHTML = feedbackHtml;
      };
    }
    // Add TTS event for bullet answers
    if (["one_word","short_answer","long_answer","case_study"].includes(type)) {
      block.querySelectorAll('.tts-btn[data-tts-bullets]').forEach(btn => {
        btn.addEventListener('click', function(e) {
          e.stopPropagation();
          const text = decodeURIComponent(btn.getAttribute('data-tts-bullets'));
          speakBulletsWithPause(text, 600); // 600ms pause
        });
      });
    }
  });
}

function speakText(text) {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  ttsUtter = new SpeechSynthesisUtterance(text);
  ttsUtter.rate = 1.05;
  ttsUtter.pitch = 1.0;
  ttsUtter.lang = 'en-US';
  ttsIsSpeaking = true;
  ttsUtter.onend = () => { ttsIsSpeaking = false; };
  window.speechSynthesis.speak(ttsUtter);
}

function stopTTS() {
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
    ttsIsSpeaking = false;
  }
}

function speakMindmapAll(nodes) {
  if (!nodes || nodes.length === 0) return;
  let queue = [];
  function collectTitles(nodes) {
    nodes.forEach(node => {
      queue.push(node.title);
      if (node.children) collectTitles(node.children);
    });
  }
  collectTitles(nodes);
  let idx = 0;
  function speakNext() {
    if (idx >= queue.length) return;
    speakText(queue[idx]);
    ttsUtter.onend = () => {
      idx++;
      if (ttsIsSpeaking && idx < queue.length) speakNext();
    };
  }
  ttsIsSpeaking = true;
  speakNext();
}

async function loadMindmap() {
  if (!mindmapData) {
    try {
      mindmapData = await fetch(getChapterPath('mindmap.json')).then(r => r.json());
      console.log('[DEBUG] mindmapData loaded:', mindmapData);
    } catch (err) {
      console.error('[DEBUG] Error loading mindmapData:', err);
      mindmapData = null;
    }
  } else {
    console.log('[DEBUG] mindmapData (cached):', mindmapData);
  }
  const container = document.getElementById('content');
  container.innerHTML = '<h2 style="font-family:Montserrat,Arial,sans-serif;font-size:2rem;color:#fc575e;">Mindmap</h2>';
  if (!mindmapData || Object.keys(mindmapData).length === 0) {
    console.warn('[DEBUG] mindmapData is empty or missing:', mindmapData);
    container.innerHTML += '<p>No mindmap available for this chapter.</p>';
    return;
  }
  function renderNodes(nodes, level = 0) {
    if (!nodes || nodes.length === 0) {
      console.warn('[DEBUG] renderNodes called with empty nodes:', nodes);
      return '';
    }
    let html = `<ul class='mindmap-list'>`;
    nodes.forEach((node, idx) => {
      const hasChildren = node.children && node.children.length > 0;
      const nodeId = `mindmap-node-${level}-${idx}-${Math.random().toString(36).substr(2,5)}`;
      html += `<li>`;
      html += `<div class='mindmap-node${hasChildren ? '' : ' leaf'} collapsed' id='${nodeId}'>`;
      html += `<span class='arrow'>${hasChildren ? '▶' : ''}</span>`;
      html += `<span class='node-title'>${node.title}</span>`;
      html += `<button class='tts-btn' title='Listen' data-tts="${encodeURIComponent(node.title)}">🔊</button>`;
      html += `</div>`;
      if (hasChildren) {
        html += `<div class='mindmap-children' style='display:none;'>${renderNodes(node.children, level+1)}</div>`;
      }
      html += `</li>`;
    });
    html += `</ul>`;
    console.log('[DEBUG] renderNodes output at level', level, ':', html);
    return html;
  }
  console.log('[DEBUG] Rendering mindmap title:', mindmapData.title);
  console.log('[DEBUG] Rendering mindmap nodes:', mindmapData.nodes);
  container.innerHTML += `<h3 style='font-family:Montserrat,Arial,sans-serif;color:#f7b42c;'>${mindmapData.title}</h3>` + renderNodes(mindmapData.nodes);

  // Add expand/collapse logic
  document.querySelectorAll('.mindmap-node').forEach(node => {
    node.addEventListener('click', function(e) {
      if (e.target.classList.contains('tts-btn')) return; // Don't collapse on TTS click
      e.stopPropagation();
      if (node.classList.contains('leaf')) return;
      node.classList.toggle('collapsed');
      const children = node.parentElement.querySelector('.mindmap-children');
      if (children) {
        children.style.display = children.style.display === 'none' ? 'block' : 'none';
      }
    });
  });
  // Only expand the highest level (root) nodes by default; all sub-levels remain collapsed
  document.querySelectorAll('.mindmap-node').forEach(node => {
    if (node.parentElement.parentElement.classList.contains('mindmap-list') && !node.classList.contains('leaf')) {
      node.classList.remove('collapsed');
      const children = node.parentElement.querySelector('.mindmap-children');
      if (children) children.style.display = 'none';
    }
  });
  // Add TTS event listeners
  document.querySelectorAll('.tts-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      if (btn.hasAttribute('data-tts-stop')) {
        stopTTS();
      } else {
        const text = decodeURIComponent(btn.getAttribute('data-tts'));
        speakText(text);
      }
    });
  });
  // Add global TTS controls only for mindmap
  addGlobalTTSControls(container);
  // Global TTS controls
  const ttsStartGlobal = document.getElementById('ttsStartGlobal');
  const ttsStopGlobal = document.getElementById('ttsStopGlobal');
  if (ttsStartGlobal && ttsStopGlobal) {
    ttsStartGlobal.onclick = () => {
      stopTTS();
      speakMindmapAll(mindmapData.nodes);
    };
    ttsStopGlobal.onclick = () => stopTTS();
  }
}

function addGlobalTTSControls(container) {
  let ttsControls = document.getElementById('tts-global-controls');
  if (!ttsControls) {
    ttsControls = document.createElement('div');
    ttsControls.id = 'tts-global-controls';
    ttsControls.className = 'tts-global-controls';
    ttsControls.style = 'text-align:center;margin-bottom:12px;';
    ttsControls.innerHTML = `
      <button id="ttsStartGlobal" class="tts-btn-main">🔊 Start TTS</button>
      <button id="ttsStopGlobal" class="tts-btn-main">⏹️ Stop TTS</button>
    `;
    container.prepend(ttsControls);
  }
  const ttsStartGlobal = document.getElementById('ttsStartGlobal');
  const ttsStopGlobal = document.getElementById('ttsStopGlobal');
  if (ttsStartGlobal && ttsStopGlobal) {
    ttsStartGlobal.onclick = () => stopTTS(); // Default: stop any ongoing TTS
    ttsStopGlobal.onclick = () => stopTTS();
  }
}

async function loadFlashcards() {
  if (!flashcardsData) {
    try {
      flashcardsData = await fetch(getChapterPath('flashcards.json')).then(r => r.json());
    } catch {
      flashcardsData = null;
    }
  }
  const container = document.getElementById('content');
  container.innerHTML = '<h2 style="font-family:Montserrat,Arial,sans-serif;font-size:2rem;color:#fc575e;">Flashcards</h2>';
  if (!flashcardsData || !Array.isArray(flashcardsData) || flashcardsData.length === 0) {
    container.innerHTML += '<p>No flashcards available for this chapter.</p>';
    return;
  }
  let current = 0;
  function renderFlashcard(idx) {
    const card = flashcardsData[idx];
    return `
      <div class='flashcard-container'>
        <div class='flashcard' id='flashcard'>
          <div class='flashcard-inner' id='flashcard-inner'>
            <div class='flashcard-front'>${card.question}</div>
            <div class='flashcard-back'>${card.answer}</div>
          </div>
        </div>
        <div style='margin-top:10px;font-size:0.98rem;color:#888;'>Click the card to flip</div>
      </div>
      <div class='flashcard-nav' style='margin-bottom:24px;'>
        <button id='prevFlash' ${idx === 0 ? 'disabled' : ''}>&larr; Prev</button>
        <span style='font-size:1.1rem;font-family:Montserrat;'>${idx+1} / ${flashcardsData.length}</span>
        <button id='nextFlash' ${idx === flashcardsData.length-1 ? 'disabled' : ''}>Next &rarr;</button>
      </div>
    `;
  }
  function updateFlashcard(idx) {
    container.innerHTML = '<h2 style="font-family:Montserrat,Arial,sans-serif;font-size:2rem;color:#fc575e;">Flashcards</h2>' + renderFlashcard(idx);
    const card = document.getElementById('flashcard');
    const inner = document.getElementById('flashcard-inner');
    let flipped = false;
    card.onclick = () => {
      flipped = !flipped;
      if (flipped) card.classList.add('flipped');
      else card.classList.remove('flipped');
    };
    document.getElementById('prevFlash').onclick = () => {
      if (current > 0) {
        current--;
        updateFlashcard(current);
      }
    };
    document.getElementById('nextFlash').onclick = () => {
      if (current < flashcardsData.length-1) {
        current++;
        updateFlashcard(current);
      }
    };
  }
  addGlobalTTSControls(container);
  updateFlashcard(current);
}

async function loadExercises() {
  const fetchUrl = getChapterPath('exercises.json');
  console.log('[DEBUG] loadExercises called');
  console.log('[DEBUG] Fetching exercises from:', fetchUrl);
  if (!exercisesData) {
    try {
      const response = await fetch(fetchUrl);
      console.log('[DEBUG] Raw fetch response:', response);
      if (!response.ok) {
        console.error('[DEBUG] Fetch failed with status:', response.status);
        exercisesData = null;
      } else {
        const data = await response.json();
        console.log('[DEBUG] Raw JSON loaded:', data);
        exercisesData = data;
        if (exercisesData && Array.isArray(exercisesData.exercises)) {
          exercisesData = exercisesData.exercises;
          console.log('[DEBUG] exercisesData extracted from .exercises:', exercisesData);
        }
      }
    } catch (e) {
      exercisesData = null;
      console.error('[DEBUG] Failed to load exercisesData:', e);
    }
  } else {
    console.log('[DEBUG] exercisesData already loaded:', exercisesData);
  }
  const container = document.getElementById('content');
  container.innerHTML = '<h2>Exercises</h2>';
  if (!exercisesData || exercisesData.length === 0) {
    container.innerHTML += '<p>No exercises available for this chapter.</p>';
    console.warn('[DEBUG] No exercises available for this chapter.');
    return;
  }
  container.innerHTML += `<pre>${JSON.stringify(exercisesData, null, 2)}</pre>`;
  addGlobalTTSControls(container);
}

async function loadQA() {
  const fetchUrl = getChapterPath('qa.json');
  console.log('[DEBUG] loadQA called');
  console.log('[DEBUG] Fetching Q&A from:', fetchUrl);
  let qaData = null;
  try {
    const response = await fetch(fetchUrl);
    if (!response.ok) {
      console.error('[DEBUG] Fetch failed with status:', response.status);
      return;
    }
    const data = await response.json();
    qaData = data.qa;
    console.log('[DEBUG] qaData loaded:', qaData);
  } catch (e) {
    console.error('[DEBUG] Failed to load qaData:', e);
    return;
  }
  const container = document.getElementById('content');
  container.innerHTML = '<h2>Q&amp;A</h2>';
  if (!qaData || qaData.length === 0) {
    container.innerHTML += '<p>No Q&amp;A available for this chapter.</p>';
    return;
  }
  qaData.forEach((item, idx) => {
    const qid = `qa${idx}`;
    container.innerHTML += `
      <div class='question-block'>
        <b>Q${idx+1}:</b> ${item.question}<br>
        <textarea id='${qid}-input' rows='2' style='width:90%;margin:8px 0;'></textarea><br>
        <button onclick="checkQAAnswer('${qid}', '${encodeURIComponent(item.answer)}')">Check Answer</button>
        <div id='${qid}-feedback' class='qa-feedback' style='margin-top:6px;'></div>
      </div>
    `;
  });
  addGlobalTTSControls(container);
}

function checkQAAnswer(qid, encodedAnswer) {
  const userInput = document.getElementById(`${qid}-input`).value.trim();
  const correctAnswer = decodeURIComponent(encodedAnswer).trim();
  const feedbackDiv = document.getElementById(`${qid}-feedback`);
  if (!userInput) {
    feedbackDiv.innerHTML = '<span style="color:orange;">Please enter your answer above.</span>';
    return;
  }
  // Simple case-insensitive match
  if (userInput.toLowerCase() === correctAnswer.toLowerCase()) {
    feedbackDiv.innerHTML = `<span style='color:green;'>Correct!<br>Answer: ${correctAnswer}</span>`;
  } else {
    feedbackDiv.innerHTML = `<span style='color:red;'>Incorrect.<br>Correct Answer: ${correctAnswer}</span>`;
  }
}

function removeGlobalTTSControls() {
  const ttsControls = document.getElementById('tts-global-controls');
  if (ttsControls) ttsControls.remove();
}

function speakCurrentContent() {
  const container = document.getElementById('content');
  if (currentSection === 'mindmap' && mindmapData && mindmapData.nodes) {
    speakMindmapAll(mindmapData.nodes);
  } else if (currentSection === 'flashcards' && flashcardsData) {
    // Speak current flashcard
    const card = container.querySelector('.flashcard-front');
    if (card) speakText(card.textContent);
  } else if (["mcq","one_word","assertion_reason","short_answer","long_answer","case_study"].includes(currentSection) && questionsData) {
    // Speak first visible question
    const qBlock = container.querySelector('.question-block');
    if (qBlock) speakText(qBlock.textContent);
  } else if (currentSection === 'exercises' && exercisesData) {
    speakText(container.textContent);
  }
}

function speakAllVisibleContent() {
  const container = document.getElementById('content');
  if (currentSection === 'mindmap' && mindmapData && mindmapData.nodes) {
    speakMindmapAll(mindmapData.nodes);
  } else if (currentSection === 'flashcards' && flashcardsData) {
    // Speak all flashcard questions
    const cards = container.querySelectorAll('.flashcard-front');
    let idx = 0;
    function speakNext() {
      if (idx >= cards.length) return;
      speakText(cards[idx].textContent);
      ttsUtter.onend = () => {
        idx++;
        if (ttsIsSpeaking && idx < cards.length) speakNext();
      };
    }
    if (cards.length > 0) {
      ttsIsSpeaking = true;
      speakNext();
    }
  } else if (["mcq","one_word","assertion_reason","short_answer","long_answer","case_study"].includes(currentSection) && questionsData) {
    // Speak all visible questions
    const qBlocks = container.querySelectorAll('.question-block');
    let idx = 0;
    function speakNext() {
      if (idx >= qBlocks.length) return;
      speakText(qBlocks[idx].textContent);
      ttsUtter.onend = () => {
        idx++;
        if (ttsIsSpeaking && idx < qBlocks.length) speakNext();
      };
    }
    if (qBlocks.length > 0) {
      ttsIsSpeaking = true;
      speakNext();
    }
  } else if (currentSection === 'exercises' && exercisesData) {
    speakText(container.textContent);
  }
}

function showSection(section) {
  currentSection = section;
  if (section === 'mindmap') loadMindmap();
  else if (section === 'flashcards') loadFlashcards();
  else if (section === 'exercises') loadExercises();
  else if (section === 'case_study') loadCaseStudies();
  else if (section === 'qa') loadQA();
  else loadQuestions(section);
}

// Loads and renders case studies from the separate case_studies.json file
async function loadCaseStudies() {
  const container = document.getElementById('content');
  container.innerHTML = '<h2 style="font-family:Montserrat,Arial,sans-serif;font-size:2rem;color:#fc575e;">Case Studies</h2>';
  let caseStudies = null;
  try {
    caseStudies = await fetch(getChapterPath('case_studies.json')).then(r => r.json());
  } catch (e) {
    container.innerHTML += '<p>Could not load case studies for this chapter.</p>';
    return;
  }
  if (!caseStudies || !Array.isArray(caseStudies) || caseStudies.length === 0) {
    container.innerHTML += '<p>No case studies available for this chapter.</p>';
    return;
  }
  caseStudies.forEach((cs, idx) => {
    const block = document.createElement('div');
    block.className = 'question-block';
    let html = `<b>Case ${idx+1}:</b> ${cs.case}<br><br>`;
    cs.questions.forEach((q, qidx) => {
      html += `<b>Q${idx+1}.</b> ${q}<br>`;
      html += `<div class='explanation'><b>Answer:</b> ${cs.answers[qidx]} <button class='tts-btn' title='Listen Answer' data-tts-bullets='${encodeURIComponent(cs.answers[qidx])}'>🔊</button></div>`;
    });
    block.innerHTML = html;
    container.appendChild(block);
  });
  // Add TTS event for bullet answers
  container.querySelectorAll('.tts-btn[data-tts-bullets]').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      const text = decodeURIComponent(btn.getAttribute('data-tts-bullets'));
      speakBulletsWithPause(text, 600); // 600ms pause
    });
  });
  addGlobalTTSControls(container);
}

window.showSection = showSection;

document.addEventListener('DOMContentLoaded', () => {
  const ttsStartNav = document.getElementById('ttsStartGlobalNav');
  const ttsStopNav = document.getElementById('ttsStopGlobalNav');
  if (ttsStartNav && ttsStopNav) {
    ttsStartNav.onclick = () => {
      stopTTS();
      speakAllVisibleContent();
    };
    ttsStopNav.onclick = () => stopTTS();
  }
  showSection('mindmap');
});

// In the rendering logic for long/case-based answers, add this replacement:
// answerHtml = answerText.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
// This ensures double newlines become paragraph breaks, single newlines become line breaks.
// Example usage in app.js:
//
// let answerHtml = answerText.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
// answerDiv.innerHTML = answerHtml;

function speakBulletsWithPause(text, pauseMs = 500) {
  if (!window.speechSynthesis) return;
  stopTTS();
  // Split into paragraphs, then lines (bullets)
  let points = text.split(/\n{2,}/g).flatMap(para => para.split(/\n/).filter(line => line.trim().length > 0));
  let idx = 0;
  function speakNext() {
    if (idx >= points.length) return;
    let line = points[idx].replace(/^[-\d.]+\s*/, '').trim();
    if (line) {
      ttsUtter = new SpeechSynthesisUtterance(line);
      ttsUtter.rate = 1.05;
      ttsUtter.pitch = 1.0;
      ttsUtter.lang = 'en-US';
      ttsIsSpeaking = true;
      ttsUtter.onend = () => {
        setTimeout(() => {
          idx++;
          if (ttsIsSpeaking && idx < points.length) speakNext();
        }, pauseMs);
      };
      window.speechSynthesis.speak(ttsUtter);
    } else {
      idx++;
      speakNext();
    }
  }
  if (points.length > 0) {
    ttsIsSpeaking = true;
    speakNext();
  }
}
