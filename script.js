const players = [
  { name: "PLAYER 01", role: "OWNER / PLAYER", pos: "SO / HU" },
  { name: "PLAYER 02", role: "COACH / PLAYER", pos: "POSITION" },
  { name: "PLAYER 03", role: "COACH / PLAYER", pos: "POSITION" },
  { name: "PLAYER 04", role: "PLAYER", pos: "POSITION" },
  { name: "PLAYER 05", role: "PLAYER", pos: "POSITION" },
  { name: "PLAYER 06", role: "PLAYER", pos: "POSITION" },
  { name: "PLAYER 07", role: "PLAYER", pos: "POSITION" },
  { name: "PLAYER 08", role: "PLAYER", pos: "POSITION" }
];

const rosterGrid = document.getElementById("rosterGrid");
players.forEach((p, i) => {
  const initials = p.name.split(" ").map(x => x[0]).join("").slice(0, 2);
  const card = document.createElement("article");
  card.className = "player-card reveal";
  card.innerHTML = `
    <div class="number">#${String(i + 1).padStart(2,"0")}</div>
    <div class="avatar">${initials}</div>
    <h3>${p.name}</h3>
    <p>${p.role} • ${p.pos}</p>
  `;
  rosterGrid.appendChild(card);
});

document.getElementById("year").textContent = new Date().getFullYear();

const toggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");
toggle.addEventListener("click", () => {
  nav.classList.toggle("open");
  toggle.setAttribute("aria-expanded", nav.classList.contains("open"));
});
nav.querySelectorAll("a").forEach(a => a.addEventListener("click", () => nav.classList.remove("open")));

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
