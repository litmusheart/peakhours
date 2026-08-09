const translations = window.translations;
const languageCodes = ['en', 'he', 'th', 'ru'];
const languageLabels = { en:'EN', he:'HE', th:'TH', ru:'RU' };
const storageKey = 'peak-hours-language';
let currentLanguage = 'en';
let currentQuestion = 0;
let score = 0;
let missed = [];
let answered = false;
let selectedAnswer = null;
let handwritingSelection = null;
let celebrationPlayed = false;
let reviewTargetIndex = null;

const trainingSections = [...document.querySelectorAll('main .section')];
const revealItems = [...document.querySelectorAll('.reveal')];
const trainingProgress = document.querySelector('#trainingProgress');
const progressCount = document.querySelector('#progressCount');
const progressTitle = document.querySelector('#progressTitle');
const progressDots = document.querySelector('#progressDots');
const languageGate = document.querySelector('#languageGate');
const languageGateTitle = document.querySelector('#languageGateTitle');
const languageOptions = document.querySelector('#languageOptions');
const languageSwitcher = document.querySelector('#languageSwitcher');
const languageMenu = document.querySelector('#languageMenu');
const trainingScreens = [...document.querySelectorAll('[data-training-screen]')];
const stepNav = document.querySelector('#stepNav');
const previousScreen = document.querySelector('#previousScreen');
const nextScreen = document.querySelector('#nextScreen');
const screenCount = document.querySelector('#screenCount');
const screenDots = document.querySelector('#screenDots');
const quizReviewReturn = document.querySelector('#quizReviewReturn');
const quizReviewContext = document.querySelector('#quizReviewContext');
const backToQuizResults = document.querySelector('#backToQuizResults');
let activeScreen = 0;
let touchStartX = 0;
let touchStartY = 0;
let touchStartedOnControl = false;

function getValue(object, path) {
  return path.split('.').reduce((value, key) => value && value[key], object);
}

function format(template, values) {
  return Object.entries(values).reduce((text, [key, value]) => text.replaceAll(`{${key}}`, value), template);
}

function readStoredLanguage() {
  try { return localStorage.getItem(storageKey); } catch { return null; }
}

function storeLanguage(language) {
  try { localStorage.setItem(storageKey, language); } catch { /* Storage may be unavailable for local files. */ }
}

function buildLanguageControls() {
  languageOptions.replaceChildren();
  languageMenu.replaceChildren();
  languageCodes.forEach((code) => {
    const gateButton = document.createElement('button');
    gateButton.type = 'button';
    gateButton.lang = code;
    const gateCode = document.createElement('span');
    gateCode.className = 'language-code';
    gateCode.textContent = languageLabels[code];
    const gateName = document.createElement('span');
    gateName.textContent = translations[code].meta.name;
    gateButton.append(gateCode, gateName);
    gateButton.addEventListener('click', () => chooseLanguage(code));
    languageOptions.append(gateButton);

    const menuButton = document.createElement('button');
    menuButton.type = 'button';
    menuButton.lang = code;
    const menuCode = document.createElement('span');
    menuCode.className = 'language-code';
    menuCode.textContent = languageLabels[code];
    const menuName = document.createElement('span');
    menuName.textContent = translations[code].meta.name;
    menuButton.append(menuCode, menuName);
    menuButton.addEventListener('click', () => {
      chooseLanguage(code);
      languageMenu.hidden = true;
    });
    languageMenu.append(menuButton);
  });
}

function chooseLanguage(language) {
  applyLanguage(language);
  storeLanguage(language);
  languageGate.classList.add('is-hidden');
  document.body.classList.remove('language-locked');
}

function setLocalizedText(element, value) {
  const leadingSymbol = value.match(/^([✓×])\s+(.+)$/u);
  const trailingSymbol = value.match(/^(.+?)\s+([✓×])$/u);
  if (!leadingSymbol && !trailingSymbol) {
    element.textContent = value;
    return;
  }
  const group = document.createElement('span');
  group.className = 'localized-symbol-label';
  const icon = document.createElement('span');
  icon.className = 'localized-symbol-label__icon';
  icon.setAttribute('aria-hidden', 'true');
  const text = document.createElement('span');
  text.className = 'localized-symbol-label__text';
  text.dir = currentLanguage === 'he' ? 'rtl' : 'ltr';
  if (leadingSymbol) {
    icon.textContent = leadingSymbol[1];
    text.textContent = leadingSymbol[2];
    group.append(icon, text);
  } else {
    text.textContent = trailingSymbol[1];
    icon.textContent = trailingSymbol[2];
    group.append(text, icon);
  }
  element.replaceChildren(group);
}

function applyLanguage(language) {
  currentLanguage = translations[language] ? language : 'en';
  const copy = translations[currentLanguage];
  document.documentElement.lang = currentLanguage;
  document.documentElement.dir = currentLanguage === 'he' ? 'rtl' : 'ltr';
  document.title = `${copy.hero.peak} ${copy.hero.hours}`;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const value = getValue(copy, element.dataset.i18n);
    if (typeof value === 'string') setLocalizedText(element, value);
  });
  document.querySelectorAll('[data-i18n-alt]').forEach((element) => {
    const value = getValue(copy, element.dataset.i18nAlt);
    if (typeof value === 'string') element.alt = value;
  });
  document.querySelectorAll('[data-i18n-aria]').forEach((element) => {
    const value = getValue(copy, element.dataset.i18nAria);
    if (typeof value === 'string') element.setAttribute('aria-label', value);
  });
  languageGateTitle.textContent = copy.meta.choose;
  languageSwitcher.replaceChildren();
  const currentCode = document.createElement('span');
  currentCode.className = 'language-switcher__code';
  currentCode.textContent = languageLabels[currentLanguage];
  const chevron = document.createElement('span');
  chevron.className = 'language-switcher__chevron';
  chevron.textContent = '▾';
  languageSwitcher.append(currentCode, chevron);
  languageSwitcher.setAttribute('aria-label', `${copy.meta.switch}: ${copy.meta.name}`);
  renderHandwritingAnswers();
  renderChecklist();
  setTrainingStep(findCurrentStep());
  updateScreenNavigation();
  if (quizComplete.hidden) renderQuestion(true);
  else renderCompletion();
  quizReviewContext.textContent = copy.knowledge.fromQuiz;
  backToQuizResults.textContent = copy.knowledge.backResults;
}

function renderHandwritingAnswers() {
  const container = document.querySelector('#handwritingAnswers');
  const result = document.querySelector('#numberQuiz .quiz__result');
  container.replaceChildren();
  result.className = 'quiz__result';
  result.textContent = '';
  translations[currentLanguage].sections.writing.answers.forEach((answer, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = answer;
    button.addEventListener('click', () => {
      container.querySelectorAll('button').forEach((item) => item.classList.remove('selected'));
      button.classList.add('selected');
      handwritingSelection = index;
      const isCorrect = index === 0;
      result.textContent = translations[currentLanguage].sections.writing.feedback[index];
      result.className = `quiz__result show ${isCorrect ? 'correct' : 'wrong'}`;
    });
    container.append(button);
    if (index === handwritingSelection) {
      button.classList.add('selected');
      const isCorrect = index === 0;
      result.textContent = translations[currentLanguage].sections.writing.feedback[index];
      result.className = `quiz__result show ${isCorrect ? 'correct' : 'wrong'}`;
    }
  });
}

function renderChecklist() {
  const list = document.querySelector('#finalChecklist');
  const moreList = document.querySelector('#finalChecklistMore');
  list.replaceChildren();
  moreList.replaceChildren();
  translations[currentLanguage].sections.checklist.items.forEach((item, index) => {
    const li = document.createElement('li');
    const icon = document.createElement('i');
    icon.textContent = '✓';
    icon.setAttribute('aria-hidden', 'true');
    const text = document.createElement('span');
    text.textContent = item;
    li.append(icon, text);
    (index < 4 ? list : moreList).append(li);
  });
}

revealItems.forEach((item) => item.classList.remove('visible'));
trainingSections.forEach(() => progressDots.append(document.createElement('i')));

function findCurrentStep() {
  const center = window.innerHeight * 0.45;
  let bestIndex = 0;
  let bestDistance = Infinity;
  trainingSections.forEach((section, index) => {
    const rect = section.getBoundingClientRect();
    const distance = Math.abs((rect.top + Math.min(rect.height, window.innerHeight) / 2) - center);
    if (distance < bestDistance) { bestDistance = distance; bestIndex = index; }
  });
  return bestIndex;
}

function setTrainingStep(index) {
  const key = trainingSections[index].dataset.stepKey;
  const label = translations[currentLanguage].sections[key].step;
  const title = label.includes('/') ? label.split('/')[1].trim() : label;
  progressCount.textContent = `${String(index + 1).padStart(2, '0')} / ${String(trainingSections.length).padStart(2, '0')}`;
  progressTitle.textContent = title;
  [...progressDots.children].forEach((dot, dotIndex) => dot.classList.toggle('done', dotIndex <= index));
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) entry.target.classList.add('visible');
  });
}, { threshold: 0.08 });
revealItems.forEach((item) => revealObserver.observe(item));
if (revealItems[0]) revealItems[0].classList.add('visible');

const stepObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) setTrainingStep(trainingSections.indexOf(entry.target));
  });
}, { rootMargin: '-30% 0px -55% 0px', threshold: 0 });
trainingSections.forEach((section) => stepObserver.observe(section));

function updateProgressVisibility() {
  const heroBottom = document.querySelector('.hero').getBoundingClientRect().bottom;
  const quizTop = document.querySelector('#knowledgeCheck').getBoundingClientRect().top;
  trainingProgress.classList.toggle('is-visible', heroBottom < 70 && quizTop > 70);
}
window.addEventListener('scroll', updateProgressVisibility, { passive: true });

languageSwitcher.addEventListener('click', () => { languageMenu.hidden = !languageMenu.hidden; });
document.addEventListener('click', (event) => {
  if (!languageMenu.contains(event.target) && !languageSwitcher.contains(event.target)) languageMenu.hidden = true;
});

const questionCount = document.querySelector('#questionCount');
const quizScore = document.querySelector('#quizScore');
const quizProgress = document.querySelector('#quizProgress');
const questionText = document.querySelector('#questionText');
const scenarioAnswers = document.querySelector('#scenarioAnswers');
const answerFeedback = document.querySelector('#answerFeedback');
const nextQuestion = document.querySelector('#nextQuestion');
const questionPanel = document.querySelector('#questionPanel');
const quizComplete = document.querySelector('#quizComplete');
const finalScore = document.querySelector('#finalScore');
const missedRules = document.querySelector('#missedRules');
const perfectScoreMessage = document.querySelector('#perfectScoreMessage');

const reviewSections = {
  'ready-to-pack': { titlePath:'sections.ready.step' },
  'check-number': { titlePath:'sections.number.step' },
  'write-clearly': { titlePath:'sections.writing.step' },
  'number-visible': { titlePath:'sections.visible.step' },
  'customer-name': { titlePath:'sections.customerName.step' },
  'keep-order-together': { titlePath:'sections.together.step' },
  'fridge-full': { titlePath:'sections.together.fridgeFull' },
  'finished-order': { titlePath:'sections.done.step' },
  carts: { titlePath:'sections.carts.step' },
  water: { titlePath:'sections.water.step' },
  diapers: { titlePath:'sections.diapers.title' },
  'listen-help': { titlePath:'sections.listen.step' }
};

function getReviewTitle(sectionId) {
  const value = getValue(translations[currentLanguage], reviewSections[sectionId].titlePath);
  return value.includes('/') ? value.split('/').slice(1).join('/').trim() : value;
}

function removeCelebration() {
  document.querySelector('#quizCelebration')?.remove();
}

function playPerfectScoreCelebration() {
  if (celebrationPlayed || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  celebrationPlayed = true;
  removeCelebration();
  const layer = document.createElement('div');
  layer.id = 'quizCelebration';
  layer.className = 'quiz-celebration';
  layer.setAttribute('aria-hidden', 'true');
  const colors = ['#00c2e8', '#ffd166', '#f05b55', '#24a96b', '#ffffff'];
  for (let burstIndex = 0; burstIndex < 3; burstIndex += 1) {
    const burst = document.createElement('i');
    burst.className = 'quiz-celebration__burst';
    burst.style.setProperty('--x', `${20 + burstIndex * 30}%`);
    burst.style.setProperty('--y', `${22 + (burstIndex % 2) * 20}%`);
    burst.style.setProperty('--delay', `${burstIndex * 0.22}s`);
    for (let sparkIndex = 0; sparkIndex < 12; sparkIndex += 1) {
      const spark = document.createElement('b');
      spark.style.setProperty('--angle', `${sparkIndex * 30}deg`);
      spark.style.setProperty('--color', colors[(sparkIndex + burstIndex) % colors.length]);
      burst.append(spark);
    }
    layer.append(burst);
  }
  for (let index = 0; index < 22; index += 1) {
    const piece = document.createElement('span');
    piece.className = 'quiz-celebration__piece';
    piece.style.setProperty('--left', `${(index * 37) % 100}%`);
    piece.style.setProperty('--delay', `${(index % 8) * 0.08}s`);
    piece.style.setProperty('--drift', `${((index % 5) - 2) * 28}px`);
    piece.style.setProperty('--color', colors[index % colors.length]);
    layer.append(piece);
  }
  document.body.append(layer);
  window.setTimeout(() => layer.remove(), 3400);
}

function resetKnowledgeCheck() {
  currentQuestion = 0;
  score = 0;
  missed = [];
  answered = false;
  selectedAnswer = null;
  celebrationPlayed = false;
  reviewTargetIndex = null;
  removeCelebration();
  quizReviewReturn.hidden = true;
  perfectScoreMessage.hidden = true;
  if (questionPanel) questionPanel.hidden = false;
  if (quizComplete) quizComplete.hidden = true;
}

function renderQuestion(preserveAnswer = false) {
  if (currentQuestion >= translations[currentLanguage].knowledge.questions.length) return;
  const copy = translations[currentLanguage].knowledge;
  const item = copy.questions[currentQuestion];
  questionCount.textContent = format(copy.question, {current:currentQuestion + 1,total:copy.questions.length});
  quizScore.textContent = `${score}/${copy.questions.length}`;
  quizProgress.style.width = `${((currentQuestion + 1) / copy.questions.length) * 100}%`;
  questionText.textContent = item.q;
  scenarioAnswers.replaceChildren();
  answerFeedback.className = 'answer-feedback';
  answerFeedback.textContent = '';
  nextQuestion.classList.remove('show');
  if (!preserveAnswer) selectedAnswer = null;
  answered = preserveAnswer && selectedAnswer !== null;
  item.a.forEach((answer, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = answer;
    button.addEventListener('click', () => selectAnswer(index));
    scenarioAnswers.append(button);
  });
  if (answered) renderSelectedAnswer();
}

function renderSelectedAnswer() {
  const copy = translations[currentLanguage].knowledge;
  const item = copy.questions[currentQuestion];
  const buttons = [...scenarioAnswers.querySelectorAll('button')];
  buttons.forEach((button) => { button.disabled = true; });
  buttons[item.correct].classList.add('correct');
  const isCorrect = selectedAnswer === item.correct;
  if (!isCorrect) buttons[selectedAnswer].classList.add('incorrect');
  answerFeedback.textContent = `${isCorrect ? copy.correct : copy.incorrect} ${item.rule}`;
  answerFeedback.className = `answer-feedback show ${isCorrect ? 'correct' : 'incorrect'}`;
  nextQuestion.textContent = currentQuestion === copy.questions.length - 1 ? copy.result : copy.continue;
  nextQuestion.classList.add('show');
}

function selectAnswer(selectedIndex) {
  if (answered) return;
  answered = true;
  selectedAnswer = selectedIndex;
  const copy = translations[currentLanguage].knowledge;
  const item = copy.questions[currentQuestion];
  const buttons = [...scenarioAnswers.querySelectorAll('button')];
  buttons.forEach((button) => { button.disabled = true; });
  buttons[item.correct].classList.add('correct');
  const isCorrect = selectedIndex === item.correct;
  if (isCorrect) score += 1;
  else { buttons[selectedIndex].classList.add('incorrect'); missed.push({question:currentQuestion}); }
  quizScore.textContent = `${score}/${copy.questions.length}`;
  answerFeedback.textContent = `${isCorrect ? copy.correct : copy.incorrect} ${item.rule}`;
  answerFeedback.className = `answer-feedback show ${isCorrect ? 'correct' : 'incorrect'}`;
  nextQuestion.textContent = currentQuestion === copy.questions.length - 1 ? copy.result : copy.continue;
  nextQuestion.classList.add('show');
}

nextQuestion.addEventListener('click', () => {
  currentQuestion += 1;
  if (currentQuestion < translations[currentLanguage].knowledge.questions.length) renderQuestion();
  else { questionPanel.hidden = true; quizComplete.hidden = false; renderCompletion(); }
});

function renderCompletion() {
  const copy = translations[currentLanguage].knowledge;
  finalScore.textContent = `${score}/${copy.questions.length}`;
  missedRules.replaceChildren();
  const isPerfect = score === copy.questions.length;
  perfectScoreMessage.hidden = !isPerfect;
  perfectScoreMessage.textContent = isPerfect ? copy.perfect : '';
  if (isPerfect) playPerfectScoreCelebration();
  if (!isPerfect) {
    const heading = document.createElement('p');
    heading.className = 'missed-rules__heading';
    heading.textContent = copy.review;
    missedRules.append(heading);
    const sectionIds = [...new Set(missed.map(({question}) => copy.questions[question].relatedSection))];
    sectionIds.forEach((sectionId) => {
      const title = getReviewTitle(sectionId);
      const link = document.createElement('button');
      link.type = 'button';
      link.className = 'missed-rule-link';
      link.textContent = title;
      link.setAttribute('aria-label', format(copy.reviewLinkLabel, {title}));
      link.addEventListener('click', () => openQuizReviewSection(sectionId));
      missedRules.append(link);
    });
  }
}

function openQuizReviewSection(sectionId) {
  const section = document.getElementById(sectionId);
  const targetIndex = trainingScreens.indexOf(section);
  if (targetIndex < 0) return;
  reviewTargetIndex = targetIndex;
  quizReviewContext.textContent = translations[currentLanguage].knowledge.fromQuiz;
  backToQuizResults.textContent = translations[currentLanguage].knowledge.backResults;
  showScreen(targetIndex, targetIndex < activeScreen ? -1 : 1);
}

backToQuizResults.addEventListener('click', () => {
  reviewTargetIndex = null;
  quizReviewReturn.hidden = true;
  showScreen(trainingScreens.indexOf(document.querySelector('#knowledgeCheck')), 1);
  renderCompletion();
});

function updateScreenNavigation() {
  if (!trainingScreens.length) return;
  screenCount.textContent = `${String(activeScreen + 1).padStart(2, '0')} / ${String(trainingScreens.length).padStart(2, '0')}`;
  [...screenDots.children].forEach((dot, index) => dot.classList.toggle('active', index <= activeScreen));
  previousScreen.disabled = activeScreen === 0;
  nextScreen.disabled = activeScreen === trainingScreens.length - 1;
  const rtl = currentLanguage === 'he';
  previousScreen.textContent = rtl ? '→' : '←';
  nextScreen.textContent = rtl ? '←' : '→';
  const labelPath = trainingScreens[activeScreen].dataset.screenLabel;
  const label = labelPath ? getValue(translations[currentLanguage], labelPath) : '';
  stepNav.setAttribute('aria-label', label || translations[currentLanguage].meta.brand);
}

function showScreen(index, direction = 1, instant = false) {
  const target = Math.max(0, Math.min(trainingScreens.length - 1, index));
  if (target === activeScreen && trainingScreens[target].classList.contains('is-active')) return;
  trainingScreens.forEach((screen) => screen.classList.remove('is-active', 'from-next', 'from-previous'));
  activeScreen = target;
  const screen = trainingScreens[activeScreen];
  screen.classList.add('is-active');
  quizReviewReturn.hidden = reviewTargetIndex === null || activeScreen !== reviewTargetIndex;
  if (!instant) screen.classList.add(direction >= 0 ? 'from-next' : 'from-previous');
  updateScreenNavigation();
}

previousScreen.addEventListener('click', () => showScreen(activeScreen - 1, -1));
nextScreen.addEventListener('click', () => showScreen(activeScreen + 1, 1));

document.querySelector('.scroll-cue').addEventListener('click', (event) => {
  event.preventDefault();
  showScreen(1, 1);
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  const rtl = document.documentElement.dir === 'rtl';
  const moveNext = rtl ? event.key === 'ArrowLeft' : event.key === 'ArrowRight';
  showScreen(activeScreen + (moveNext ? 1 : -1), moveNext ? 1 : -1);
});

document.addEventListener('touchstart', (event) => {
  if (event.touches.length !== 1) return;
  const touch = event.touches[0];
  touchStartX = touch.clientX;
  touchStartY = touch.clientY;
  touchStartedOnControl = Boolean(event.target.closest('button,a,input,select,textarea,[role="button"],[contenteditable="true"],.language-menu,.language-gate'));
}, { passive:true });

document.addEventListener('touchend', (event) => {
  if (touchStartedOnControl || !event.changedTouches.length) return;
  const touch = event.changedTouches[0];
  const deltaX = touch.clientX - touchStartX;
  const deltaY = touch.clientY - touchStartY;
  if (Math.abs(deltaX) < 60 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
  const rtl = document.documentElement.dir === 'rtl';
  const moveNext = rtl ? deltaX > 0 : deltaX < 0;
  showScreen(activeScreen + (moveNext ? 1 : -1), moveNext ? 1 : -1);
}, { passive:true });

document.addEventListener('touchcancel', () => {
  touchStartX = 0;
  touchStartY = 0;
  touchStartedOnControl = false;
}, { passive:true });

trainingScreens.forEach(() => screenDots.append(document.createElement('i')));
showScreen(0, 1, true);
buildLanguageControls();
const storedLanguage = readStoredLanguage();
if (storedLanguage && translations[storedLanguage]) {
  languageGate.classList.add('is-hidden');
  applyLanguage(storedLanguage);
} else {
  document.body.classList.add('language-locked');
  applyLanguage('en');
}
updateProgressVisibility();
