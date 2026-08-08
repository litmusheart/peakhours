const sections = [...document.querySelectorAll('main .section')];
const progressHeader = document.querySelector('#progressHeader');
const progressCount = document.querySelector('#progressCount');
const progressTitle = document.querySelector('#progressTitle');
const progressFill = document.querySelector('#progressFill');

function setProgress(index) {
  const step = sections[index].querySelector('.step').textContent.trim();
  const title = step.includes('/') ? step.split('/')[1].trim() : step;
  progressCount.textContent = `${String(index + 1).padStart(2, '0')} / ${String(sections.length).padStart(2, '0')}`;
  progressTitle.textContent = title;
  progressFill.style.width = `${((index + 1) / sections.length) * 100}%`;
}

const sectionObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const index = sections.indexOf(entry.target);
    entry.target.classList.add('is-active');
    setProgress(index);
  });
}, { rootMargin: '-25% 0px -55% 0px', threshold: 0 });

sections.forEach((section) => sectionObserver.observe(section));

function toggleProgress() {
  progressHeader.classList.toggle('is-visible', window.scrollY > window.innerHeight * 0.35);
}

window.addEventListener('scroll', toggleProgress, { passive: true });
toggleProgress();
if (sections[0]) sections[0].classList.add('is-active');
setProgress(0);
