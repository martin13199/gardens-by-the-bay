/** Hero slideshow — crossfade through real Gardens by the Bay photos */
(function () {
  const wrap = document.getElementById("heroSlides");
  if (!wrap) return;
  const slides = Array.from(wrap.querySelectorAll(".hero-slide"));
  const dotsBox = document.getElementById("heroDots");
  const caption = document.getElementById("heroCaption");
  const hero = document.getElementById("top");
  const INTERVAL = 6500;
  let index = 0;
  let timer = null;

  // Preload remaining slides so fades are smooth
  slides.slice(1).forEach((s) => {
    const url = (s.style.backgroundImage.match(/url\(["']?(.*?)["']?\)/) || [])[1];
    if (url) new Image().src = url;
  });

  const dots = slides.map((_, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "hero-dot";
    b.setAttribute("aria-label", `Show photo ${i + 1}`);
    b.addEventListener("click", () => { go(i); restart(); });
    dotsBox.appendChild(b);
    return b;
  });

  function go(i) {
    slides[index].classList.remove("is-active");
    dots[index].classList.remove("is-active");
    index = (i + slides.length) % slides.length;
    const s = slides[index];
    // restart the Ken Burns animation
    s.style.animation = "none";
    void s.offsetWidth;
    s.style.animation = "";
    s.classList.add("is-active");
    dots[index].classList.add("is-active");
    if (caption) caption.textContent = s.dataset.caption || "";
  }

  function start() {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    timer = setInterval(() => go(index + 1), INTERVAL);
  }
  function stop() { clearInterval(timer); }
  function restart() { stop(); start(); }

  document.getElementById("heroPrev").addEventListener("click", () => { go(index - 1); restart(); });
  document.getElementById("heroNext").addEventListener("click", () => { go(index + 1); restart(); });
  hero.addEventListener("mouseenter", stop);
  hero.addEventListener("mouseleave", start);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : restart()));

  dots[0].classList.add("is-active");
  if (caption) caption.textContent = slides[0].dataset.caption || "";
  start();
})();
