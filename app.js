const KEY = "bimba-english-state";
const initialState = {
  user: null, streak: 3, lessons: 1, words: 24, goalProgress: 18, completed: [], plan: null,
  skills: { grammar: 20, vocabulary: 28, listening: 12, speaking: 10, pronunciation: 15 },
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
let activeSpeech = null;
let speechRate = 0.86;

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
const speak = (text, rate = speechRate) => {
  if (!("speechSynthesis" in window)) return toast("Tu navegador no permite reproducir voz.");
  window.speechSynthesis.cancel();
  activeSpeech = new SpeechSynthesisUtterance(text);
  activeSpeech.lang = "en-US";
  activeSpeech.rate = rate;
  window.speechSynthesis.speak(activeSpeech);
  return activeSpeech;
};
const audioPlayer = (text) => `<div class="audio-player"><button class="audio-control" data-action="audio" data-text="${escapeHtml(text)}" aria-label="Reproducir audio">▶</button><button class="audio-pause" data-action="pause" aria-label="Pausar audio">Ⅱ</button><div class="audio-track"><strong>Escuchar en inglés</strong><span>${escapeHtml(text)}</span></div><button class="speed-button" data-action="speed">1×</button></div>`;
const curriculum = [
  { id: "sentence-basics", title: "Construir una frase", topic: "grammar", skill: "grammar", level: "A1", minutes: 12, description: "Sujeto, verbo, objeto, lugar y tiempo.", phrase: "I work from home on Mondays.", tip: "Piensa en bloques: quién + qué hace + dónde + cuándo." },
  { id: "in-on-at", title: "IN, ON y AT sin liarte", topic: "grammar", skill: "grammar", level: "A2", minutes: 15, description: "Tiempo y lugar con una regla visual.", phrase: "I work at home on Monday in the morning.", tip: "IN = dentro/periodo; ON = día/superficie; AT = punto/hora." },
  { id: "adjectives", title: "Adjetivos en frases", topic: "grammar", skill: "grammar", level: "A2", minutes: 15, description: "Describir personas, cosas y emociones.", phrase: "She is a reliable colleague.", tip: "Con estados usamos be + adjetivo; delante de un nombre: a + adjetivo + noun." },
  { id: "adverbs", title: "Adverbios de frecuencia", topic: "grammar", skill: "grammar", level: "A2", minutes: 12, description: "Always, usually, often, sometimes y never.", phrase: "I usually work from home.", tip: "Van antes del verbo normal, pero después de be: I am usually tired." },
  { id: "past-simple", title: "Contar lo que pasó", topic: "grammar", skill: "grammar", level: "A2", minutes: 18, description: "Pasado simple en afirmativa, negativa y pregunta.", phrase: "I finished the report yesterday.", tip: "En preguntas y negativas, did lleva el pasado y el verbo vuelve a su forma base." },
  { id: "work-email", title: "Escribir un email claro", topic: "work", skill: "writing", level: "B1", minutes: 18, description: "Pedir, confirmar y cerrar emails profesionales.", phrase: "Could you send me the updated file, please?", tip: "Could you... es una forma educada y muy útil para pedir algo." },
  { id: "daily-routine", title: "Hablar de tu rutina", topic: "daily", skill: "speaking", level: "A1", minutes: 12, description: "Frases para contar tu día de forma natural.", phrase: "I usually get up at seven.", tip: "Usa usually para hábitos y at + hora concreta." },
  { id: "listening-small-talk", title: "Entender small talk", topic: "conversation", skill: "listening", level: "A2", minutes: 15, description: "Reconocer preguntas frecuentes en conversaciones.", phrase: "What have you been up to lately?", tip: "No intentes traducir cada palabra: identifica la intención de la pregunta." },
  { id: "travel-hotel", title: "Resolver algo en un hotel", topic: "travel", skill: "speaking", level: "A2", minutes: 15, description: "Pedir ayuda y explicar un problema.", phrase: "There seems to be a problem with the shower.", tip: "There seems to be... suaviza la forma de señalar un problema." },
  { id: "shadowing", title: "Shadowing: ritmo natural", topic: "pronunciation", skill: "pronunciation", level: "B1", minutes: 10, description: "Escucha, pausa e imita una frase completa.", phrase: "Could you say that again, please?", tip: "Imita el ritmo y las pausas, no solo cada sonido por separado." }
];
const todayKey = () => new Date().toISOString().slice(0, 10);
const ensurePlan = () => {
  if (!state.user) return;
  const minutes = Number(state.user.dailyMinutes || 15);
  const level = state.user.level?.startsWith("A1") ? "A1" : state.user.level?.startsWith("C") ? "C1" : "A2";
  const goals = state.user.goals || [];
  const preferred = goals.includes("Trabajo") ? ["work", "grammar"] : goals.includes("Viajar") ? ["travel", "daily"] : ["conversation", "grammar"];
  const done = new Set(state.completed || []);
  const ranked = curriculum.filter(l => !done.has(l.id)).sort((a, b) => {
    const aGoal = preferred.includes(a.topic) ? 0 : 1;
    const bGoal = preferred.includes(b.topic) ? 0 : 1;
    return aGoal - bGoal || Math.abs(a.minutes - minutes) - Math.abs(b.minutes - minutes);
  });
  state.plan = { date: todayKey(), minutes, lessons: ranked.slice(0, minutes >= 30 ? 3 : minutes >= 20 ? 2 : 1).map(l => l.id), level };
};
const currentPlanLessons = () => {
  if (!state.plan || state.plan.date !== todayKey()) ensurePlan();
  return (state.plan?.lessons || []).map(id => curriculum.find(l => l.id === id)).filter(Boolean);
};
const completeLesson = async id => {
  state.completed = [...new Set([...(state.completed || []), id])];
  state.lessons = (state.lessons || 0) + 1;
  state.goalProgress = Math.min(100, (state.goalProgress || 0) + 3);
  const lesson = curriculum.find(item => item.id === id);
  if (lesson) state.skills[lesson.skill] = Math.min(100, (state.skills[lesson.skill] || 0) + 5);
  ensurePlan();
  await save();
  toast("Lección completada. Bimba ha recalculado tu siguiente paso.");
  render();
};

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
  const planLessons = currentPlanLessons();
  const pending = planLessons[0];
  content.innerHTML = `<div class="hero"><div class="hero-copy"><div class="eyebrow">Tu plan de hoy · 15 min</div><h1>Hola, ${name}.<br>Hoy puedes dar un pasito más.</h1><p class="muted">Una lección corta, práctica y pensada para tu objetivo: comunicarte con confianza.</p><button class="btn" data-action="lesson">Empezar mi lección <span>→</span></button></div><div class="hero-art" aria-label="Oso panda">🐼</div></div>
  ${pending ? `<div class="section-head"><h2>Tu ruta de hoy</h2><span class="tag">${state.user?.dailyMinutes || 15} min · ${planLessons.length} ${planLessons.length === 1 ? "lección" : "lecciones"}</span></div><div class="card daily-plan"><div><span class="eyebrow">Siguiente recomendación · ${pending.level}</span><h2>${pending.title}</h2><p class="muted">${pending.description}</p><div class="tag">${pending.minutes} min · ${pending.skill}</div></div><button class="btn" data-lesson="${pending.id}">Empezar ahora →</button></div>` : `<div class="notice">Has completado tu ruta de hoy. Mañana tendrás nuevas lecciones.</div>`}
  <div class="section-head"><h2>Tu progreso</h2><button class="btn secondary" data-view="progress">Ver detalles</button></div>
  <div class="stats"><div class="stat"><span>Racha actual</span><strong>${state.streak} 🔥</strong><span>¡Sigue así!</span></div><div class="stat"><span>Palabras activas</span><strong>${state.words}</strong><span>+4 esta semana</span></div><div class="stat"><span>Objetivo mensual</span><strong>${state.goalProgress}%</strong><div class="progress-bar"><i style="width:${state.goalProgress}%"></i></div></div></div>
  <div class="section-head"><h2>Tu menú de aprendizaje</h2></div><div class="cards">
  <div class="lesson-card"><div class="lesson-icon">🎧</div><h3>Escucha y entiende</h3><p class="muted">Un diálogo de la vida real con audio lento y natural.</p><button class="btn secondary" data-action="listen">Practicar escucha</button></div>
  <div class="lesson-card"><div class="lesson-icon">💬</div><h3>Habla sin miedo</h3><p class="muted">Responde en voz alta y recibe una corrección amable.</p><button class="btn secondary" data-action="speak">Practicar conversación</button></div>
  <div class="lesson-card"><div class="lesson-icon">🧠</div><h3>Repasa lo importante</h3><p class="muted">Tu memoria sabe cuándo necesitas volver a ver cada palabra.</p><button class="btn secondary" data-view="vocabulary">Repasar palabras</button></div></div>`;
}
const topics = [
  { id: "work", icon: "💼", title: "Inglés para el trabajo", description: "Reuniones, emails y hablar con clientes.", subs: ["Reuniones", "Emails", "Small talk", "Presentaciones", "Llamadas", "Entrevistas"] },
  { id: "daily", icon: "☀️", title: "Día a día", description: "Casa, compras, recados y rutinas reales.", subs: ["Rutinas", "Compras", "Casa", "Médico", "Citas", "Problemas y soluciones"] },
  { id: "travel", icon: "✈️", title: "Viajar", description: "Aeropuerto, hotel, restaurante y pedir ayuda.", subs: ["Aeropuerto", "Hotel", "Restaurantes", "Transporte", "Direcciones", "Emergencias"] },
  { id: "conversation", icon: "💬", title: "Conversación cotidiana", description: "Hablar de ti, reaccionar y mantener una charla.", subs: ["Presentarte", "Opiniones", "Planes", "Emociones", "Bromas", "Historias"] },
  { id: "media", icon: "🎬", title: "Series, música y ocio", description: "Entender conversaciones naturales y hablar de tus gustos.", subs: ["Películas", "Música", "Libros", "Deportes", "Redes sociales", "Hobbies"] },
  { id: "grammar", icon: "🧩", title: "Gramática práctica", description: "Patrones que necesitas para expresarte mejor.", subs: ["Pasado", "Preguntas", "Futuro", "Condicionales", "Preposiciones", "Conectores"] },
  { id: "pronunciation", icon: "🗣️", title: "Pronunciación y fluidez", description: "Sonidos, ritmo, entonación y hablar sin bloquearte.", subs: ["Sonidos difíciles", "Ritmo", "Entonación", "Shadowing", "Frases rápidas"] }
];
const topicExamples = {
  work: { title: "Small talk profesional", phrase: "How is your day going so far?", meaning: "¿Qué tal va tu día hasta ahora?", word: "so far" },
  daily: { title: "En una tienda", phrase: "I'm just looking, thank you.", meaning: "Solo estoy mirando, gracias.", word: "just" },
  travel: { title: "En el hotel", phrase: "Could I have the Wi-Fi password, please?", meaning: "¿Podría darme la contraseña del Wi-Fi, por favor?", word: "password" },
  conversation: { title: "Hablar de planes", phrase: "What are you up to this weekend?", meaning: "¿Qué planes tienes este fin de semana?", word: "What are you up to?" },
  media: { title: "Hablar de una serie", phrase: "I can't stop watching this show.", meaning: "No puedo dejar de ver esta serie.", word: "show" },
  grammar: { title: "Preguntar con naturalidad", phrase: "Have you ever been to London?", meaning: "¿Has estado alguna vez en Londres?", word: "Have you ever...?" }
  , pronunciation: { title: "Ritmo natural", phrase: "Could you say that again, please?", meaning: "¿Podrías repetirlo, por favor?", word: "say that again" }
};
function lesson(id) {
  const item = curriculum.find(l => l.id === id) || curriculum[0];
  content.innerHTML = `<div class="quiz"><button class="pill-button" data-view="home">← Mi ruta</button><div class="eyebrow" style="margin-top:22px">${item.level} · ${item.minutes} min · ${item.skill}</div><h1>${item.title}</h1><p class="muted">${item.description}</p><div class="card"><span class="tag">Regla útil</span><h3>${item.tip}</h3><hr><h2>${item.phrase.split(" ").map(word => `<button class="word-chip" data-action="save-word" data-word="${word.replace(/[?.!,]/g, "")}">${word}</button>`).join(" ")}</h2>${audioPlayer(item.phrase)}<p class="muted small">Escucha, repite y pulsa cualquier palabra para guardarla.</p><h3>Mini reto</h3><p>Construye o di una frase parecida usando este patrón en tu vida real.</p><button class="btn" data-action="complete-lesson" data-lesson="${item.id}">He practicado esta lección ✓</button></div></div>`;
}
function learn() {
  content.innerHTML = `<div class="eyebrow">Elige tu camino</div><h1>¿Qué quieres aprender hoy?</h1><p class="muted">Bimba te recomendará el siguiente paso según tu objetivo, nivel y lo que ya hayas practicado.</p><div class="cards">${topics.map(t => `<div class="card"><div class="lesson-icon">${t.icon}</div><h3>${t.title}</h3><p class="muted">${t.description}</p><div>${t.subs.map(s => `<span class="tag">${s}</span>`).join("")}</div><button class="btn secondary" data-topic="${t.id}">Explorar tema →</button></div>`).join("")}</div>`;
}
function topic(id) {
  const t = topics.find(item => item.id === id) || topics[0];
  const example = topicExamples[id] || topicExamples.work;
  content.innerHTML = `<div class="quiz"><button class="pill-button" data-view="learn">← Todos los temas</button><div class="eyebrow" style="margin-top:22px">${t.icon} ${t.title}</div><h1>${example.title}</h1><p class="muted">${t.description} Elige una subsección para seguir construyendo confianza.</p><div class="checkboxes">${t.subs.map(s => `<span class="check">${s}</span>`).join("")}</div><div class="card" style="margin-top:22px"><span class="tag">Frase útil · Bimba recomienda</span><h2 class="selectable-phrase">${example.phrase.split(" ").map(word => `<button class="word-chip" data-action="save-word" data-word="${word.replace(/[?.!,]/g, "")}">${word}</button>`).join(" ")}</h2><p>${example.meaning}</p>${audioPlayer(example.phrase)}<p class="muted small">Pulsa una palabra de la frase para guardarla, o usa el botón para escuchar toda la expresión.</p><hr><h3>¿En qué situación la usarías?</h3><button class="option" data-answer="right">En una conversación real relacionada con este tema</button><button class="option" data-answer="wrong">Solo al traducir palabra por palabra</button></div></div>`;
}
function series() { content.innerHTML = `<div class="eyebrow">Aprende con historias</div><h1>Series & escenas</h1><p class="muted">Escenas cortas originales, con humor y situaciones cotidianas.</p><div class="notice">No podemos mostrar clips de <em>Friends</em> ni copiar sus subtítulos sin licencia. Para que puedas aprender de forma legal, Bimba crea escenas propias con el mismo tipo de situaciones: amigos, planes, malentendidos y conversaciones naturales.</div><div class="cards"><div class="card series-card"><div class="series-thumb">☕</div><div><span class="tag">A2 · 3 min</span><h3>The coffee plan</h3><p class="muted">Dos amigas organizan el fin de semana y practican expresiones de acuerdo.</p><button class="btn secondary" data-series="coffee">Ver escena</button></div></div><div class="card series-card"><div class="series-thumb">🛋️</div><div><span class="tag">B1 · 4 min</span><h3>The surprise party</h3><p class="muted">Un grupo de amigos intenta guardar un secreto.</p><button class="btn secondary" data-series="party">Ver escena</button></div></div><div class="card series-card"><div class="series-thumb">📱</div><div><span class="tag">B1 · 5 min</span><h3>Work group chat</h3><p class="muted">Mensajes, bromas y cómo aclarar un malentendido.</p><button class="btn secondary" data-series="chat">Ver escena</button></div></div></div>`; }
function seriesScene(id) {
  const scenes = { coffee: ["The coffee plan", "Are you up for coffee this Saturday?", "¿Te apetece tomar un café este sábado?"], party: ["The surprise party", "Keep it quiet — it’s a surprise!", "No digas nada: ¡es una sorpresa!"], chat: ["Work group chat", "Sorry, I got the wrong end of the stick.", "Perdona, lo entendí completamente mal."] };
  const scene = scenes[id] || scenes.coffee;
  content.innerHTML = `<div class="quiz"><button class="pill-button" data-view="series">← Volver a escenas</button><div class="eyebrow" style="margin-top:22px">Escena original · ${scene[0]}</div><h1>${scene[0]}</h1><div class="card"><div class="series-thumb">🎬</div><h2>${scene[1]}</h2><p>${scene[2]}</p>${audioPlayer(scene[1])}<hr><h3>Repite la frase en voz alta</h3><p class="muted">Primero escucha. Después pausa, repite y vuelve a escuchar para comparar ritmo y entonación.</p><button class="btn secondary" data-action="repeat" data-text="${scene[1]}">🎙 Repetir conmigo</button></div></div>`;
}
function vocabulary() { content.innerHTML = `<div class="eyebrow">Tu memoria inteligente</div><h1>Mi vocabulario</h1><p class="muted">Explora por categorías y guarda expresiones útiles de tus temas.</p><div class="checkboxes">${["Trabajo", "Viajar", "Conversación", "Gramática"].map(x => `<button class="check" data-action="filter">${x}</button>`).join("")}</div><div class="card" style="margin-top:16px">${state.vocabulary.map(v => `<div class="word"><div><h3>${escapeHtml(v.word)} <span class="tag">${escapeHtml(v.type)}</span></h3><small>${escapeHtml(v.meaning)} · “${escapeHtml(v.example)}”</small></div><button class="pill-button" data-action="audio" data-text="${escapeHtml(v.example)}">🔊 Escuchar</button></div>`).join("")}</div>`; }
function progress() { const skills = Object.entries(state.skills || {}); content.innerHTML = `<div class="eyebrow">Mira cómo avanzas</div><h1>Tu progreso real</h1><p class="muted">Bimba ajusta tus siguientes lecciones según lo que practicas y completas.</p><div class="card"><h2>Habilidades</h2>${skills.map(([key, value]) => `<div style="margin:16px 0"><div style="display:flex;justify-content:space-between"><strong>${({ grammar: "Gramática", vocabulary: "Vocabulario", listening: "Escucha", speaking: "Conversación", pronunciation: "Pronunciación" })[key] || key}</strong><span>${value}%</span></div><div class="progress-bar"><i style="width:${value}%"></i></div></div>`).join("")}</div><div class="section-head"><h2>Tu consejo de hoy</h2></div><div class="card"><h3>💡 Aprende en frases, no en listas</h3><p class="muted">Cuando guardes una palabra, practica también una frase propia. Así tu cerebro aprende cuándo y cómo usarla.</p></div>`; }
function profile() { const u = state.user || {}; content.innerHTML = `<div class="onboarding"><div class="card"><div class="eyebrow">Tu perfil</div><h1>Hazlo tuyo</h1><p class="muted">Tus datos hacen que las lecciones sean relevantes para tu vida real.</p><form id="profile-form"><div class="form-grid"><label>Tu nombre<input name="name" value="${escapeHtml(u.name)}" required placeholder="¿Cómo te llamas?"></label><label>Tu nivel aproximado<select name="level"><option ${u.level === "A1-A2" ? "selected" : ""}>A1-A2</option><option ${u.level === "B1-B2" ? "selected" : ""}>B1-B2</option><option ${u.level === "C1-C2" ? "selected" : ""}>C1-C2</option></select></label></div><label style="margin-top:17px">¿Cuánto tiempo quieres estudiar al día?</label><select name="dailyMinutes"><option value="10" ${u.dailyMinutes === "10" ? "selected" : ""}>10 minutos · hábito ligero</option><option value="15" ${!u.dailyMinutes || u.dailyMinutes === "15" ? "selected" : ""}>15 minutos · constante</option><option value="30" ${u.dailyMinutes === "30" ? "selected" : ""}>30 minutos · avance rápido</option><option value="45" ${u.dailyMinutes === "45" ? "selected" : ""}>45 minutos · intensivo</option></select><label style="margin-top:17px">¿Para qué quieres usar el inglés? <span class="muted">(puedes elegir varias)</span></label><div class="checkboxes">${["Trabajo", "Viajar", "Series y ocio", "Exámenes", "Conversación"].map(x => `<label class="check"><input type="checkbox" name="goals" value="${x}" ${(u.goals || []).includes(x) ? "checked" : ""}>${x}</label>`).join("")}</div><label style="margin-top:17px">¿En qué trabajas y qué haces? (opcional)<textarea name="job" placeholder="Ej.: Soy diseñadora y hablo con clientes internacionales...">${escapeHtml(u.job)}</textarea></label><button class="btn" type="submit">Guardar mi perfil</button></form></div></div>`; document.querySelector("#profile-form").addEventListener("submit", e => { e.preventDefault(); const f = new FormData(e.target); state.user = { name: f.get("name"), level: f.get("level"), dailyMinutes: f.get("dailyMinutes"), job: f.get("job"), goals: f.getAll("goals") }; ensurePlan(); save(); toast("Perfil guardado. Tu plan adaptativo está listo."); setView("home"); }); }
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
  const lessonId = e.target.closest("[data-lesson]")?.dataset.lesson;
  if (lessonId && !e.target.closest("[data-action=complete-lesson]")) return lesson(lessonId);
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (action === "setup") return setView("profile");
  if (action === "logout") { await supabaseClient?.auth.signOut(); currentSession = null; setStatus("Guardado en este dispositivo"); toast("Sesión cerrada."); return setView("home"); }
  if (action === "lesson") return setView("learn");
  if (action === "listen" || action === "speak") return toast("Práctica lista: el audio y la grabación se añadirán en la siguiente fase.");
  if (action === "audio") {
    const text = e.target.closest("[data-action=audio]").dataset.text;
    speak(text);
    return toast("Reproduciendo la frase en inglés.");
  }
  if (action === "speed") {
    speechRate = speechRate === 0.86 ? 0.62 : speechRate === 0.62 ? 1.08 : 0.86;
    e.target.closest("[data-action=speed]").textContent = `${speechRate === 0.62 ? "0,75" : speechRate === 1.08 ? "1,25" : "1"}×`;
    return toast(`Velocidad ${speechRate === 0.62 ? "lenta" : speechRate === 1.08 ? "rápida" : "normal"}. Pulsa reproducir para aplicarla.`);
  }
  if (action === "pause") {
    if (!("speechSynthesis" in window)) return toast("Tu navegador no permite controlar la voz.");
    if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
      window.speechSynthesis.pause();
      e.target.closest("[data-action=pause]").textContent = "▶";
      return toast("Audio pausado.");
    }
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
      e.target.closest("[data-action=pause]").textContent = "Ⅱ";
      return toast("Audio reanudado.");
    }
    return toast("Pulsa reproducir para empezar.");
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
  if (action === "complete-lesson") return completeLesson(e.target.closest("[data-action=complete-lesson]").dataset.lesson);
  if (action === "review") return toast("Repaso programado para dentro de 2 días.");
  if (action === "series") return toast("Lección de escena abierta: audio, subtítulos y ejercicios.");
  const answer = e.target.closest("[data-answer]")?.dataset.answer;
  if (answer === "right") { state.lessons++; state.goalProgress = Math.min(100, state.goalProgress + 4); await save(); toast("¡Muy bien! Recuperación activa completada."); render(); }
  else if (answer === "wrong") toast("Casi. Escucha la frase una vez más.");
});

if (supabaseClient) supabaseClient.auth.getSession().then(({ data }) => { if (data.session) loadCloudState(data.session); });
if (supabaseClient) supabaseClient.auth.onAuthStateChange((_event, session) => { if (session) loadCloudState(session); });
render();
