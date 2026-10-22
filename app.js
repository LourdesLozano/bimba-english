const KEY = "bimba-english-state";
const initialState = {
  user: null, streak: 3, lessons: 1, words: 24, goalProgress: 18, completed: [],
  vocabulary: [
    { word: "actually", meaning: "en realidad", type: "adverbio", example: "I actually enjoy speaking English." },
    { word: "to figure out", meaning: "averiguar / entender", type: "phrasal verb", example: "I’m trying to figure it out." },
    { word: "reliable", meaning: "de confianza", type: "adjetivo", example: "She is very reliable at work." }
  ]
};
const content = document.querySelector("#app-content");
const supabase = window.supabase?.createClient(window.BIMBA_SUPABASE.url, window.BIMBA_SUPABASE.publishableKey);
let state = JSON.parse(localStorage.getItem(KEY) || "null") || structuredClone(initialState);
let currentView = "home";
let currentSession = null;
let saveTimer;

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const toast = (message) => { const el = document.querySelector("#toast"); el.textContent = message; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2600); };
const setStatus = (message, online = false) => { const el = document.querySelector("#sync-status"); el.textContent = `${online ? "●" : "○"} ${message}`; el.style.color = online ? "var(--green)" : "var(--muted)"; };
const localSave = () => localStorage.setItem(KEY, JSON.stringify(state));
const save = async () => {
  localSave();
  if (!currentSession || !supabase) { setStatus("Guardado en este dispositivo"); return; }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { error } = await supabase.from("user_progress").upsert({ user_id: currentSession.user.id, state, updated_at: new Date().toISOString() });
    if (error) setStatus("Guardado localmente; pendiente de sincronizar");
    else setStatus("Sincronizado", true);
  }, 300);
};
const setView = (view) => { currentView = view; document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === view)); render(); window.scrollTo(0, 0); };

async function loadCloudState(session) {
  if (!session || !supabase) return;
  currentSession = session;
  const { data, error } = await supabase.from("user_progress").select("state").eq("user_id", session.user.id).maybeSingle();
  if (error) { setStatus("Sesión iniciada; usa SQL de configuración"); return; }
  if (data?.state && Object.keys(data.state).length) {
    state = { ...structuredClone(initialState), ...data.state };
    localSave();
    toast("Progreso sincronizado.");
  } else {
    await save();
    toast("Tu progreso local se ha guardado en tu cuenta.");
  }
  setStatus("Sincronizado", true);
  render();
}

function home() {
  const name = escapeHtml(state.user?.name || "aprendiz");
  content.innerHTML = `<div class="hero"><div class="hero-copy"><div class="eyebrow">Tu plan de hoy · 15 min</div><h1>Hola, ${name}.<br>Hoy puedes dar un pasito más.</h1><p class="muted">Una lección corta, práctica y pensada para tu objetivo: comunicarte con confianza.</p><button class="btn" data-action="lesson">Empezar mi lección <span>→</span></button></div><div class="hero-art" aria-label="Oso panda">🐼</div></div>
  <div class="section-head"><h2>Tu progreso</h2><button class="btn secondary" data-view="progress">Ver detalles</button></div>
  <div class="stats"><div class="stat"><span>Racha actual</span><strong>${state.streak} 🔥</strong><span>¡Sigue así!</span></div><div class="stat"><span>Palabras activas</span><strong>${state.words}</strong><span>+4 esta semana</span></div><div class="stat"><span>Objetivo mensual</span><strong>${state.goalProgress}%</strong><div class="progress-bar"><i style="width:${state.goalProgress}%"></i></div></div></div>
  <div class="section-head"><h2>Tu menú de aprendizaje</h2></div><div class="cards">
  <div class="lesson-card"><div class="lesson-icon">🎧</div><h3>Escucha y entiende</h3><p class="muted">Un diálogo de la vida real con audio lento y natural.</p><button class="btn secondary" data-action="listen">Practicar escucha</button></div>
  <div class="lesson-card"><div class="lesson-icon">💬</div><h3>Habla sin miedo</h3><p class="muted">Responde en voz alta y recibe una corrección amable.</p><button class="btn secondary" data-action="speak">Practicar conversación</button></div>
  <div class="lesson-card"><div class="lesson-icon">🧠</div><h3>Repasa lo importante</h3><p class="muted">Tu memoria sabe cuándo necesitas volver a ver cada palabra.</p><button class="btn secondary" data-view="vocabulary">Repasar palabras</button></div></div>`;
}
function learn() { content.innerHTML = `<div class="quiz"><div class="eyebrow">Lección 02 · Trabajo y comunicación</div><h1>Describe tu día de trabajo</h1><p class="muted">Escucha, recuerda y usa las expresiones que necesitas en tu contexto.</p><div class="card"><div class="series-thumb">🎧</div><h2>Small talk at work</h2><p>“How is your day going so far?”</p><button class="btn pink" data-action="audio">▶ Escuchar frase</button><hr><h3>¿Qué significa <em>so far</em>?</h3><button class="option" data-answer="right">Por ahora / hasta ahora</button><button class="option" data-answer="wrong">Para siempre</button><button class="option" data-answer="wrong">De repente</button></div></div>`; }
function series() { content.innerHTML = `<div class="eyebrow">Aprende con historias</div><h1>Series & escenas</h1><p class="muted">Aprende expresiones en contexto, como si estuvieras dentro de una conversación.</p><div class="notice">Usaremos escenas y diálogos propios o con licencia. No reproducimos episodios protegidos: trabajamos el lenguaje que aparece en situaciones tipo sitcom.</div><div class="cards"><div class="card series-card"><div class="series-thumb">☕</div><div><span class="tag">A2 · 8 min</span><h3>At the coffee shop</h3><p class="muted">Pedir, reaccionar y mantener una charla casual.</p><button class="btn secondary" data-action="series">Ver lección</button></div></div><div class="card series-card"><div class="series-thumb">🛋️</div><div><span class="tag">B1 · 12 min</span><h3>Friends-style: the weekend plan</h3><p class="muted">Planes, bromas y expresiones naturales entre amigos.</p><button class="btn secondary" data-action="series">Ver lección</button></div></div></div>`; }
function vocabulary() { content.innerHTML = `<div class="eyebrow">Tu memoria inteligente</div><h1>Mi vocabulario</h1><p class="muted">Palabras que has encontrado en tus lecciones y que volverán a aparecer en el momento justo.</p><div class="card">${state.vocabulary.map(v => `<div class="word"><div><h3>${escapeHtml(v.word)} <span class="tag">${escapeHtml(v.type)}</span></h3><small>${escapeHtml(v.meaning)} · “${escapeHtml(v.example)}”</small></div><button class="pill-button" data-action="review">Repasar</button></div>`).join("")}</div>`; }
function progress() { content.innerHTML = `<div class="eyebrow">Mira cómo avanzas</div><h1>Tu progreso real</h1><p class="muted">La fluidez no es saberlo todo: es poder hacer más cosas cada semana.</p><div class="cards"><div class="card"><h3>Comprensión auditiva</h3><strong>A2 → B1</strong><div class="progress-bar"><i style="width:64%"></i></div></div><div class="card"><h3>Vocabulario</h3><strong>${state.words} palabras activas</strong><div class="progress-bar"><i style="width:48%"></i></div></div><div class="card"><h3>Conversación</h3><strong>12 prácticas</strong><div class="progress-bar"><i style="width:32%"></i></div></div></div><div class="section-head"><h2>Tu consejo de hoy</h2></div><div class="card"><h3>💡 Habla aunque no sea perfecto</h3><p class="muted">Intenta responder primero sin traducir palabra por palabra. Después revisamos la frase y guardamos el patrón que te sirva.</p></div>`; }
function profile() { const u = state.user || {}; content.innerHTML = `<div class="onboarding"><div class="card"><div class="eyebrow">Tu perfil</div><h1>Hazlo tuyo</h1><p class="muted">Tus datos hacen que las lecciones sean relevantes para tu vida real.</p><form id="profile-form"><div class="form-grid"><label>Tu nombre<input name="name" value="${escapeHtml(u.name)}" required placeholder="¿Cómo te llamas?"></label><label>Tu nivel aproximado<select name="level"><option ${u.level === "A1-A2" ? "selected" : ""}>A1-A2</option><option ${u.level === "B1-B2" ? "selected" : ""}>B1-B2</option><option ${u.level === "C1-C2" ? "selected" : ""}>C1-C2</option></select></label></div><label style="margin-top:17px">¿Para qué quieres usar el inglés? <span class="muted">(puedes elegir varias)</span></label><div class="checkboxes">${["Trabajo", "Viajar", "Series y ocio", "Exámenes", "Conversación"].map(x => `<label class="check"><input type="checkbox" name="goals" value="${x}" ${(u.goals || []).includes(x) ? "checked" : ""}>${x}</label>`).join("")}</div><label style="margin-top:17px">¿En qué trabajas y qué haces? (opcional)<textarea name="job" placeholder="Ej.: Soy diseñadora y hablo con clientes internacionales...">${escapeHtml(u.job)}</textarea></label><button class="btn" type="submit">Guardar mi perfil</button></form></div></div>`; document.querySelector("#profile-form").addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.target); state.user = { name: f.get("name"), level: f.get("level"), job: f.get("job"), goals: f.getAll("goals") }; save(); toast("Perfil guardado. Tu plan se ha personalizado."); setView("home"); }); }
function auth() { content.innerHTML = `<div class="onboarding"><div class="card"><div class="eyebrow">Sincronización segura</div><h1>${currentSession ? "Tu cuenta Bimba" : "Guarda tu progreso en la nube"}</h1><p class="muted">${currentSession ? `Sesión iniciada como ${escapeHtml(currentSession.user.email)}.` : "Usa el mismo progreso en tu ordenador y en tu iPhone. No necesitas tarjeta."}</p>${currentSession ? `<button class="btn secondary" data-action="logout">Cerrar sesión</button>` : `<form id="auth-form"><label>Email<input name="email" type="email" required autocomplete="email" placeholder="tu@email.com"></label><label style="margin-top:14px">Contraseña<input name="password" type="password" minlength="6" required autocomplete="new-password" placeholder="Mínimo 6 caracteres"></label><div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap"><button class="btn" data-auth="signup">Crear cuenta</button><button class="btn secondary" data-auth="login">Iniciar sesión</button></div></form><p class="muted" style="margin-top:18px;font-size:12px">Tu email solo se usa para iniciar sesión. Nunca compartas tu contraseña.</p>`}</div></div>`; if (!currentSession) document.querySelector("#auth-form").addEventListener("submit", async e => { e.preventDefault(); const button = e.submitter; const f = new FormData(e.target); await authenticate(button.dataset.auth, f.get("email"), f.get("password")); }); }
async function authenticate(action, email, password) { if (!supabase) return toast("No se ha podido cargar el servicio de sincronización."); const result = action === "signup" ? await supabase.auth.signUp({ email, password }) : await supabase.auth.signInWithPassword({ email, password }); if (result.error) return toast(result.error.message); if (result.data.session) { await loadCloudState(result.data.session); setView("home"); } else toast("Revisa tu email para confirmar la cuenta y después inicia sesión."); }
function onboarding() { content.innerHTML = `<div class="onboarding"><div class="card"><div class="eyebrow">Bienvenida a Bimba English</div><h1>Aprende inglés para tu vida real.</h1><p class="muted">Lecciones adaptadas a tu nivel, tus objetivos y lo que haces cada día.</p><div class="notice">Puedes probarla sin cuenta. Para conservar tu progreso entre ordenador e iPhone, crea una cuenta gratuita desde “Sincronizar progreso”.</div><button class="btn" data-action="setup">Crear mi perfil →</button></div></div>`; }
function render() { if (!state.user && currentView === "home") return onboarding(); ({ home, learn, series, vocabulary, progress, profile, auth }[currentView] || home)(); }

document.querySelector("#main-nav").addEventListener("click", e => { const button = e.target.closest("[data-view]"); if (button) setView(button.dataset.view); });
document.querySelector("#profile-button").addEventListener("click", () => setView("profile"));
document.querySelector("#auth-button").addEventListener("click", () => setView("auth"));
document.addEventListener("click", async e => {
  const view = e.target.closest("[data-view]"); if (view) return setView(view.dataset.view);
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (action === "setup") return setView("profile");
  if (action === "logout") { await supabase?.auth.signOut(); currentSession = null; setStatus("Guardado en este dispositivo"); toast("Sesión cerrada."); return setView("home"); }
  if (action === "lesson") return setView("learn");
  if (action === "listen" || action === "speak") return toast("Práctica lista: el audio y la grabación se añadirán en la siguiente fase.");
  if (action === "audio") return toast("Audio de ejemplo preparado para conectar con voz real.");
  if (action === "review") return toast("Repaso programado para dentro de 2 días.");
  if (action === "series") return toast("Lección de escena abierta: audio, subtítulos y ejercicios.");
  const answer = e.target.closest("[data-answer]")?.dataset.answer;
  if (answer === "right") { state.lessons++; state.goalProgress = Math.min(100, state.goalProgress + 4); await save(); toast("¡Muy bien! Recuperación activa completada."); render(); }
  else if (answer === "wrong") toast("Casi. Escucha la frase una vez más.");
});

if (supabase) supabase.auth.getSession().then(({ data }) => { if (data.session) loadCloudState(data.session); });
if (supabase) supabase.auth.onAuthStateChange((_event, session) => { if (session) loadCloudState(session); });
render();
