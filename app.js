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
const supabaseClient = window.supabase?.createClient(window.BIMBA_SUPABASE.url, window.BIMBA_SUPABASE.publishableKey);
const APP_URL = "https://lourdeslozano.github.io/bimba-english/";
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
  if (!currentSession || !supabaseClient) { setStatus("Guardado en este dispositivo"); return; }
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { error } = await supabaseClient.from("user_progress").upsert({ user_id: currentSession.user.id, state, updated_at: new Date().toISOString() });
    if (error) setStatus("Guardado localmente; pendiente de sincronizar");
    else setStatus("Sincronizado", true);
  }, 300);
};
const setView = (view) => { currentView = view; document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === view)); render(); window.scrollTo(0, 0); };

async function loadCloudState(session) {
  if (!session || !supabaseClient) return;
  currentSession = session;
  const { data, error } = await supabaseClient.from("user_progress").select("state").eq("user_id", session.user.id).maybeSingle();
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
const topics = [
  { id: "work", icon: "💼", title: "Inglés para el trabajo", description: "Reuniones, emails y hablar con clientes.", subs: ["Reuniones", "Emails", "Small talk profesional"] },
  { id: "travel", icon: "✈️", title: "Viajar", description: "Aeropuerto, hotel, restaurante y pedir ayuda.", subs: ["Aeropuerto", "Hotel", "Restaurantes"] },
  { id: "conversation", icon: "💬", title: "Conversación cotidiana", description: "Hablar de ti, reaccionar y mantener una charla.", subs: ["Presentarte", "Opiniones", "Planes y tiempo libre"] },
  { id: "grammar", icon: "🧩", title: "Gramática práctica", description: "Patrones que necesitas para expresarte mejor.", subs: ["Pasado", "Preguntas", "Conectores"] }
];
const topicExamples = {
  work: { title: "Small talk profesional", phrase: "How is your day going so far?", meaning: "¿Qué tal va tu día hasta ahora?", word: "so far" },
  travel: { title: "En el hotel", phrase: "Could I have the Wi-Fi password, please?", meaning: "¿Podría darme la contraseña del Wi-Fi, por favor?", word: "password" },
  conversation: { title: "Hablar de planes", phrase: "What are you up to this weekend?", meaning: "¿Qué planes tienes este fin de semana?", word: "What are you up to?" },
  grammar: { title: "Preguntar con naturalidad", phrase: "Have you ever been to London?", meaning: "¿Has estado alguna vez en Londres?", word: "Have you ever...?" }
};
function learn() {
  content.innerHTML = `<div class="eyebrow">Elige tu camino</div><h1>¿Qué quieres aprender hoy?</h1><p class="muted">Bimba te recomendará el siguiente paso según tu objetivo, nivel y lo que ya hayas practicado.</p><div class="cards">${topics.map(t => `<div class="card"><div class="lesson-icon">${t.icon}</div><h3>${t.title}</h3><p class="muted">${t.description}</p><div>${t.subs.map(s => `<span class="tag">${s}</span>`).join("")}</div><button class="btn secondary" data-topic="${t.id}">Explorar tema →</button></div>`).join("")}</div>`;
}
function topic(id) {
  const t = topics.find(item => item.id === id) || topics[0];
  const example = topicExamples[id] || topicExamples.work;
  content.innerHTML = `<div class="quiz"><button class="pill-button" data-view="learn">← Todos los temas</button><div class="eyebrow" style="margin-top:22px">${t.icon} ${t.title}</div><h1>${example.title}</h1><p class="muted">${t.description} Elige una subsección para seguir construyendo confianza.</p><div class="checkboxes">${t.subs.map(s => `<span class="check">${s}</span>`).join("")}</div><div class="card" style="margin-top:22px"><span class="tag">Frase útil · Bimba recomienda</span><h2>${example.phrase}</h2><p>${example.meaning}</p><button class="btn pink" data-action="audio" data-text="${example.phrase}">▶ Escuchar frase</button><button class="btn secondary" data-action="save-word" data-word="${example.word}" style="margin-left:8px">♡ Guardar expresión</button><hr><h3>¿En qué situación la usarías?</h3><button class="option" data-answer="right">En una conversación real relacionada con este tema</button><button class="option" data-answer="wrong">Solo al traducir palabra por palabra</button></div></div>`;
}
function series() { content.innerHTML = `<div class="eyebrow">Aprende con historias</div><h1>Series & escenas</h1><p class="muted">Escenas cortas originales, con humor y situaciones cotidianas.</p><div class="notice">No podemos mostrar clips de <em>Friends</em> ni copiar sus subtítulos sin licencia. Para que puedas aprender de forma legal, Bimba crea escenas propias con el mismo tipo de situaciones: amigos, planes, malentendidos y conversaciones naturales.</div><div class="cards"><div class="card series-card"><div class="series-thumb">☕</div><div><span class="tag">A2 · 3 min</span><h3>The coffee plan</h3><p class="muted">Dos amigas organizan el fin de semana y practican expresiones de acuerdo.</p><button class="btn secondary" data-series="coffee">Ver escena</button></div></div><div class="card series-card"><div class="series-thumb">🛋️</div><div><span class="tag">B1 · 4 min</span><h3>The surprise party</h3><p class="muted">Un grupo de amigos intenta guardar un secreto.</p><button class="btn secondary" data-series="party">Ver escena</button></div></div><div class="card series-card"><div class="series-thumb">📱</div><div><span class="tag">B1 · 5 min</span><h3>Work group chat</h3><p class="muted">Mensajes, bromas y cómo aclarar un malentendido.</p><button class="btn secondary" data-series="chat">Ver escena</button></div></div></div>`; }
function seriesScene(id) {
  const scenes = { coffee: ["The coffee plan", "Are you up for coffee this Saturday?", "¿Te apetece tomar un café este sábado?"], party: ["The surprise party", "Keep it quiet — it’s a surprise!", "No digas nada: ¡es una sorpresa!"], chat: ["Work group chat", "Sorry, I got the wrong end of the stick.", "Perdona, lo entendí completamente mal."] };
  const scene = scenes[id] || scenes.coffee;
  content.innerHTML = `<div class="quiz"><button class="pill-button" data-view="series">← Volver a escenas</button><div class="eyebrow" style="margin-top:22px">Escena original · ${scene[0]}</div><h1>${scene[0]}</h1><div class="card"><div class="series-thumb">🎬</div><h2>${scene[1]}</h2><p>${scene[2]}</p><button class="btn pink" data-action="audio" data-text="${scene[1]}">▶ Escuchar diálogo</button><hr><h3>Repite la frase en voz alta</h3><p class="muted">Primero escucha. Después pausa, repite y vuelve a escuchar para comparar ritmo y entonación.</p><button class="btn secondary" data-action="repeat" data-text="${scene[1]}">🎙 Repetir conmigo</button></div></div>`;
}
function vocabulary() { content.innerHTML = `<div class="eyebrow">Tu memoria inteligente</div><h1>Mi vocabulario</h1><p class="muted">Explora por categorías y guarda expresiones útiles de tus temas.</p><div class="checkboxes">${["Trabajo", "Viajar", "Conversación", "Gramática"].map(x => `<button class="check" data-action="filter">${x}</button>`).join("")}</div><div class="card" style="margin-top:16px">${state.vocabulary.map(v => `<div class="word"><div><h3>${escapeHtml(v.word)} <span class="tag">${escapeHtml(v.type)}</span></h3><small>${escapeHtml(v.meaning)} · “${escapeHtml(v.example)}”</small></div><button class="pill-button" data-action="audio" data-text="${escapeHtml(v.example)}">🔊 Escuchar</button></div>`).join("")}</div>`; }
function progress() { content.innerHTML = `<div class="eyebrow">Mira cómo avanzas</div><h1>Tu progreso real</h1><p class="muted">La fluidez no es saberlo todo: es poder hacer más cosas cada semana.</p><div class="cards"><div class="card"><h3>Comprensión auditiva</h3><strong>A2 → B1</strong><div class="progress-bar"><i style="width:64%"></i></div></div><div class="card"><h3>Vocabulario</h3><strong>${state.words} palabras activas</strong><div class="progress-bar"><i style="width:48%"></i></div></div><div class="card"><h3>Conversación</h3><strong>12 prácticas</strong><div class="progress-bar"><i style="width:32%"></i></div></div></div><div class="section-head"><h2>Tu consejo de hoy</h2></div><div class="card"><h3>💡 Habla aunque no sea perfecto</h3><p class="muted">Intenta responder primero sin traducir palabra por palabra. Después revisamos la frase y guardamos el patrón que te sirva.</p></div>`; }
function profile() { const u = state.user || {}; content.innerHTML = `<div class="onboarding"><div class="card"><div class="eyebrow">Tu perfil</div><h1>Hazlo tuyo</h1><p class="muted">Tus datos hacen que las lecciones sean relevantes para tu vida real.</p><form id="profile-form"><div class="form-grid"><label>Tu nombre<input name="name" value="${escapeHtml(u.name)}" required placeholder="¿Cómo te llamas?"></label><label>Tu nivel aproximado<select name="level"><option ${u.level === "A1-A2" ? "selected" : ""}>A1-A2</option><option ${u.level === "B1-B2" ? "selected" : ""}>B1-B2</option><option ${u.level === "C1-C2" ? "selected" : ""}>C1-C2</option></select></label></div><label style="margin-top:17px">¿Para qué quieres usar el inglés? <span class="muted">(puedes elegir varias)</span></label><div class="checkboxes">${["Trabajo", "Viajar", "Series y ocio", "Exámenes", "Conversación"].map(x => `<label class="check"><input type="checkbox" name="goals" value="${x}" ${(u.goals || []).includes(x) ? "checked" : ""}>${x}</label>`).join("")}</div><label style="margin-top:17px">¿En qué trabajas y qué haces? (opcional)<textarea name="job" placeholder="Ej.: Soy diseñadora y hablo con clientes internacionales...">${escapeHtml(u.job)}</textarea></label><button class="btn" type="submit">Guardar mi perfil</button></form></div></div>`; document.querySelector("#profile-form").addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.target); state.user = { name: f.get("name"), level: f.get("level"), job: f.get("job"), goals: f.getAll("goals") }; save(); toast("Perfil guardado. Tu plan se ha personalizado."); setView("home"); }); }
function auth() { content.innerHTML = `<div class="onboarding"><div class="card"><div class="eyebrow">Sincronización segura</div><h1>${currentSession ? "Tu cuenta Bimba" : "Guarda tu progreso en la nube"}</h1><p class="muted">${currentSession ? `Sesión iniciada como ${escapeHtml(currentSession.user.email)}.` : "Usa el mismo progreso en tu ordenador y en tu iPhone. No necesitas tarjeta."}</p>${currentSession ? `<button class="btn secondary" data-action="logout">Cerrar sesión</button>` : `<form id="auth-form"><label>Email<input name="email" type="email" required autocomplete="email" placeholder="tu@email.com"></label><label style="margin-top:14px">Contraseña<input name="password" type="password" minlength="6" required autocomplete="new-password" placeholder="Mínimo 6 caracteres"></label><div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap"><button class="btn" data-auth="signup">Crear cuenta</button><button class="btn secondary" data-auth="login">Iniciar sesión</button></div></form><p class="muted" style="margin-top:18px;font-size:12px">Tu email solo se usa para iniciar sesión. Nunca compartas tu contraseña.</p>`}</div></div>`; if (!currentSession) document.querySelector("#auth-form").addEventListener("submit", async e => { e.preventDefault(); const button = e.submitter; const f = new FormData(e.target); await authenticate(button.dataset.auth, f.get("email"), f.get("password")); }); }
async function authenticate(action, email, password) { if (!supabaseClient) return toast("No se ha podido cargar el servicio de sincronización."); const result = action === "signup" ? await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: APP_URL } }) : await supabaseClient.auth.signInWithPassword({ email, password }); if (result.error) return toast(result.error.message); if (result.data.session) { await loadCloudState(result.data.session); setView("home"); } else toast("Revisa tu email para confirmar la cuenta y después inicia sesión."); }
function onboarding() { content.innerHTML = `<div class="onboarding"><div class="card"><div class="eyebrow">Bienvenida a Bimba English</div><h1>Aprende inglés para tu vida real.</h1><p class="muted">Lecciones adaptadas a tu nivel, tus objetivos y lo que haces cada día.</p><div class="notice">Puedes probarla sin cuenta. Para conservar tu progreso entre ordenador e iPhone, crea una cuenta gratuita desde “Sincronizar progreso”.</div><button class="btn" data-action="setup">Crear mi perfil →</button></div></div>`; }
function render() { if (!state.user && currentView === "home") return onboarding(); ({ home, learn, series, vocabulary, progress, profile, auth }[currentView] || home)(); }

document.querySelector("#main-nav").addEventListener("click", e => { const button = e.target.closest("[data-view]"); if (button) setView(button.dataset.view); });
document.querySelector("#profile-button").addEventListener("click", () => setView("profile"));
document.querySelector("#auth-button").addEventListener("click", () => setView("auth"));
document.addEventListener("click", async e => {
  const view = e.target.closest("[data-view]"); if (view) return setView(view.dataset.view);
  const topicId = e.target.closest("[data-topic]")?.dataset.topic; if (topicId) return topic(topicId);
  const seriesId = e.target.closest("[data-series]")?.dataset.series; if (seriesId) return seriesScene(seriesId);
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (action === "setup") return setView("profile");
  if (action === "logout") { await supabaseClient?.auth.signOut(); currentSession = null; setStatus("Guardado en este dispositivo"); toast("Sesión cerrada."); return setView("home"); }
  if (action === "lesson") return setView("learn");
  if (action === "listen" || action === "speak") return toast("Práctica lista: el audio y la grabación se añadirán en la siguiente fase.");
  if (action === "audio") {
    if (!("speechSynthesis" in window)) return toast("Tu navegador no permite reproducir voz.");
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(e.target.closest("[data-action=audio]").dataset.text);
    utterance.lang = "en-US";
    utterance.rate = 0.86;
    window.speechSynthesis.speak(utterance);
    return toast("Reproduciendo la frase en inglés.");
  }
  if (action === "repeat") {
    const text = e.target.closest("[data-action=repeat]").dataset.text;
    if (!("speechSynthesis" in window)) return toast("Tu navegador no permite reproducir voz.");
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";
    utterance.rate = 0.72;
    window.speechSynthesis.speak(utterance);
    return toast("Escucha y repite con calma.");
  }
  if (action === "save-word") {
    const word = e.target.closest("[data-action=save-word]").dataset.word;
    if (!state.vocabulary.some(item => item.word === word)) {
      state.vocabulary.unshift({ word, meaning: "expresión guardada", type: "expresión", example: word });
      state.words++;
      await save();
    }
    return toast("Expresión guardada en tu vocabulario.");
  }
  if (action === "review") return toast("Repaso programado para dentro de 2 días.");
  if (action === "series") return toast("Lección de escena abierta: audio, subtítulos y ejercicios.");
  const answer = e.target.closest("[data-answer]")?.dataset.answer;
  if (answer === "right") { state.lessons++; state.goalProgress = Math.min(100, state.goalProgress + 4); await save(); toast("¡Muy bien! Recuperación activa completada."); render(); }
  else if (answer === "wrong") toast("Casi. Escucha la frase una vez más.");
});

if (supabaseClient) supabaseClient.auth.getSession().then(({ data }) => { if (data.session) loadCloudState(data.session); });
if (supabaseClient) supabaseClient.auth.onAuthStateChange((_event, session) => { if (session) loadCloudState(session); });
render();
