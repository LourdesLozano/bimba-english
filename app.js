const KEY = "bimba-english-state";
const initialState = {
  user: null, streak: 3, lessons: 1, words: 24, goalProgress: 18, completed: [], plan: null, diagnostic: null,
  skills: { grammar: 20, vocabulary: 28, listening: 12, speaking: 10, pronunciation: 15 },
  errors: [], reviewQueue: [],
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
let viewHistory = [];
let currentSession = null;
let saveTimer;
let activeSpeech = null;
let speechRate = 0.86;
let activeRecorder = null;
let activeRecognition = null;
state = { ...structuredClone(initialState), ...state, skills: { ...initialState.skills, ...(state.skills || {}) }, reviewQueue: state.reviewQueue || [], errors: state.errors || [] };
const vocabTopics = [
  { id: "food", icon: "🍽️", title: "Comida y cocina", description: "Todo lo necesario para comprar, cocinar y hablar de comida.", sections: [
    ["Recetas y cocina", [["chop", "picar", "Chop the onion into small pieces."], ["boil", "hervir", "Boil the pasta for ten minutes."], ["recipe", "receta", "This recipe is easy to follow."]]],
    ["Platos y comidas", [["dish", "plato", "This is my favourite dish."], ["starter", "entrante", "We ordered a starter to share."], ["dessert", "postre", "Would you like dessert?"]]],
    ["Cubiertos y vajilla", [["fork", "tenedor", "Could I have a fork, please?"], ["plate", "plato", "Put the plates on the table."], ["mug", "taza grande", "I drink tea from this mug."]]],
    ["Frutas y verduras", [["carrot", "zanahoria", "I chopped a carrot for the soup."], ["lettuce", "lechuga", "Add some lettuce to the salad."], ["strawberry", "fresa", "These strawberries are delicious."]]],
    ["Carnes y pescados", [["beef", "carne de vacuno", "I don't eat much beef."], ["chicken", "pollo", "We are having chicken for dinner."], ["salmon", "salmón", "The salmon is fresh."]]],
    ["Comprar comida", [["aisle", "pasillo", "The rice is in aisle five."], ["weigh", "pesar", "Could you weigh these apples?"], ["ripe", "maduro", "These bananas are ripe."]]]
  ] },
  { id: "home", icon: "🏠", title: "Casa", description: "Habitaciones, muebles, tareas y reparaciones.", sections: [
    ["Habitaciones", [["kitchen", "cocina", "The kitchen is next to the living room."], ["bedroom", "dormitorio", "My bedroom is upstairs."], ["hallway", "pasillo", "Leave your shoes in the hallway."]]],
    ["Muebles y objetos", [["shelf", "estantería", "The books are on the shelf."], ["drawer", "cajón", "The keys are in the drawer."], ["cushion", "cojín", "There are two cushions on the sofa."]]],
    ["Tareas domésticas", [["laundry", "colada", "I need to do the laundry."], ["mop", "fregar", "I have to mop the floor."], ["tidy", "ordenar", "I like to keep my room tidy."]]],
    ["Problemas y reparaciones", [["leak", "fuga", "There is a leak under the sink."], ["broken", "roto", "The washing machine is broken."], ["fix", "arreglar", "Can you fix the door?"]]]
  ] },
  { id: "people", icon: "👥", title: "Personas y personalidad", description: "Describir personas, emociones y relaciones.", sections: [
    ["Personalidad", [["reliable", "de confianza", "She is a reliable colleague."], ["outgoing", "extrovertido", "He is friendly and outgoing."], ["thoughtful", "atento", "That was very thoughtful of you."]]],
    ["Emociones", [["relieved", "aliviado", "I felt relieved after the exam."], ["annoyed", "molesto", "She was annoyed by the noise."], ["grateful", "agradecido", "I am grateful for your help."]]],
    ["Aspecto y descripción", [["tall", "alto", "He is tall and slim."], ["curly", "rizado", "She has curly hair."], ["casual", "informal", "He was wearing casual clothes."]]],
    ["Relaciones", [["neighbour", "vecino", "Our neighbours are very kind."], ["colleague", "compañero de trabajo", "I had lunch with a colleague."], ["relative", "familiar", "Most of my relatives live nearby."]]]
  ] },
  { id: "work", icon: "💼", title: "Trabajo", description: "Oficina, proyectos, comunicación y carrera.", sections: [
    ["Oficina", [["deadline", "fecha límite", "We have a tight deadline."], ["meeting", "reunión", "The meeting starts at nine."], ["colleague", "compañero", "My colleague sent the email."]]],
    ["Proyectos", [["task", "tarea", "I have three tasks to finish."], ["schedule", "calendario", "The schedule has changed."], ["feedback", "comentarios", "Could you give me some feedback?"]]],
    ["Comunicación profesional", [["clarify", "aclarar", "Could you clarify this point?"], ["attach", "adjuntar", "I have attached the document."], ["follow up", "hacer seguimiento", "I am following up on our call."]]],
    ["Entrevistas y carrera", [["experience", "experiencia", "I have five years of experience."], ["strength", "punto fuerte", "Communication is one of my strengths."], ["salary", "salario", "We discussed the salary."]]]
  ] },
  { id: "travel", icon: "✈️", title: "Viajes", description: "Preparar viajes, moverte y resolver imprevistos.", sections: [
    ["Aeropuerto", [["boarding pass", "tarjeta de embarque", "Where can I print my boarding pass?"], ["gate", "puerta de embarque", "Our gate has changed."], ["luggage", "equipaje", "My luggage is missing."]]],
    ["Hotel", [["reservation", "reserva", "I have a reservation under Lopez."], ["checkout", "salida", "What time is checkout?"], ["towel", "toalla", "Could I have an extra towel?"]]],
    ["Transporte y direcciones", [["platform", "andén", "Which platform does the train leave from?"], ["straight", "recto", "Go straight and turn left."], ["fare", "tarifa", "How much is the fare?"]]],
    ["Restaurante y ocio", [["bill", "cuenta", "Could we have the bill, please?"], ["booking", "reserva", "I made a booking online."], ["sightseeing", "turismo", "We went sightseeing all day."]]]
  ] }
];
vocabTopics.push(
  { id: "health", icon: "🩺", title: "Salud y cuerpo", description: "Explicar síntomas, citas y hábitos saludables.", sections: [
    ["Cuerpo", [["shoulder", "hombro", "My shoulder hurts."], ["ankle", "tobillo", "I twisted my ankle."], ["throat", "garganta", "I have a sore throat."]]],
    ["Síntomas", [["headache", "dolor de cabeza", "I have a terrible headache."], ["rash", "sarpullido", "This rash is very itchy."], ["swollen", "hinchado", "My knee is swollen."]]],
    ["Médico y farmacia", [["appointment", "cita", "I need to make an appointment."], ["prescription", "receta médica", "The doctor gave me a prescription."], ["painkiller", "analgésico", "Take this painkiller after eating."]]],
    ["Hábitos saludables", [["exercise", "ejercicio", "I exercise three times a week."], ["balanced", "equilibrado", "I try to eat a balanced diet."], ["sleep", "dormir", "Getting enough sleep is important."]]]
  ] },
  { id: "shopping", icon: "🛍️", title: "Compras y ropa", description: "Comprar, probar, devolver y describir prendas.", sections: [
    ["Ropa", [["sleeve", "manga", "This shirt has short sleeves."], ["pocket", "bolsillo", "There is a pocket on the jacket."], ["pattern", "estampado", "I like the pattern on this dress."]]],
    ["Tallas y medidas", [["size", "talla", "Do you have this in a smaller size?"], ["fit", "quedar", "These jeans fit me perfectly."], ["loose", "holgado", "This sweater is too loose."]]],
    ["Comprar y pagar", [["receipt", "recibo", "Could I have a receipt, please?"], ["refund", "reembolso", "I would like a refund."], ["cash", "efectivo", "Can I pay in cash?"]]],
    ["Calidad y opiniones", [["durable", "duradero", "These shoes are very durable."], ["comfortable", "cómodo", "They are comfortable to wear."], ["affordable", "asequible", "It is good quality and affordable."]]]
  ] },
  { id: "technology", icon: "💻", title: "Tecnología y móvil", description: "Dispositivos, internet y problemas técnicos.", sections: [
    ["Dispositivos", [["screen", "pantalla", "The screen is cracked."], ["charger", "cargador", "I forgot my phone charger."], ["headphones", "auriculares", "I use headphones for calls."]]],
    ["Internet y cuentas", [["password", "contraseña", "I need to reset my password."], ["account", "cuenta", "I created a new account."], ["download", "descargar", "Click here to download the file."]]],
    ["Problemas técnicos", [["freeze", "bloquearse", "My computer keeps freezing."], ["crash", "fallar", "The app crashed again."], ["update", "actualización", "You need to update the software."]]],
    ["Trabajo digital", [["upload", "subir", "Please upload the document."], ["link", "enlace", "I sent you the link."], ["attachment", "archivo adjunto", "The attachment is too large."]]]
  ] },
  { id: "nature", icon: "🌿", title: "Naturaleza y clima", description: "Tiempo, paisajes, animales y actividades al aire libre.", sections: [
    ["Tiempo", [["forecast", "previsión", "The forecast says it will rain."], ["humid", "húmedo", "It is hot and humid today."], ["breeze", "brisa", "There is a lovely breeze."]]],
    ["Paisajes", [["valley", "valle", "The village is in a beautiful valley."], ["coast", "costa", "We walked along the coast."], ["waterfall", "cascada", "There is a waterfall nearby."]]],
    ["Animales y plantas", [["wildlife", "fauna", "The park is famous for its wildlife."], ["branch", "rama", "The bird is sitting on a branch."], ["wildflower", "flor silvestre", "I saw a field of wildflowers."]]],
    ["Aire libre", [["hike", "hacer senderismo", "We went for a hike."], ["trail", "sendero", "This trail leads to the lake."], ["shelter", "refugio", "We found shelter from the rain."]]]
  ] },
  { id: "education", icon: "📚", title: "Estudios y aprendizaje", description: "Clases, exámenes, idiomas y organización.", sections: [
    ["Clase", [["subject", "asignatura", "English was my favourite subject."], ["assignment", "tarea", "I have to finish an assignment."], ["semester", "semestre", "The semester starts in September."]]],
    ["Exámenes", [["grade", "nota", "I got a good grade."], ["revise", "repasar", "I need to revise for the test."], ["pass", "aprobar", "She passed her exam."]]],
    ["Aprender idiomas", [["fluency", "fluidez", "Fluency takes regular practice."], ["accent", "acento", "I am working on my accent."], ["mistake", "error", "Making mistakes is part of learning."]]],
    ["Organización", [["deadline", "fecha límite", "The deadline is next Friday."], ["notes", "apuntes", "I took notes during the lecture."], ["schedule", "horario", "I made a study schedule."]]]
  ] },
  { id: "money", icon: "💳", title: "Dinero y bancos", description: "Pagos, presupuesto, compras y gestiones.", sections: [
    ["Banco", [["branch", "sucursal", "The bank branch closes at five."], ["transfer", "transferencia", "I made a bank transfer."], ["balance", "saldo", "I checked my account balance."]]],
    ["Pagos", [["contactless", "sin contacto", "Can I pay contactless?"], ["charge", "cobrar", "They charged me twice."], ["fee", "comisión", "Is there an extra fee?"]]],
    ["Presupuesto", [["budget", "presupuesto", "I am trying to stick to my budget."], ["save", "ahorrar", "I save a little every month."], ["expense", "gasto", "Rent is my biggest expense."]]],
    ["Problemas", [["refund", "reembolso", "The refund has not arrived."], ["fraud", "fraude", "I think there has been fraud."], ["receipt", "recibo", "Keep the receipt just in case."]]]
  ] },
  { id: "social", icon: "🎉", title: "Vida social y planes", description: "Invitar, aceptar, rechazar y disfrutar con gente.", sections: [
    ["Invitaciones", [["invite", "invitar", "I would like to invite you to dinner."], ["available", "disponible", "Are you available on Saturday?"], ["join", "unirse", "Would you like to join us?"]]],
    ["Planes", [["cancel", "cancelar", "I am sorry, I have to cancel."], ["arrange", "organizar", "Let’s arrange a time to meet."], ["venue", "lugar del evento", "The venue is near the station."]]],
    ["Reacciones", [["brilliant", "genial", "That sounds brilliant."], ["shame", "pena", "What a shame you cannot come."], ["awkward", "incómodo", "There was an awkward silence."]]],
    ["Celebraciones", [["host", "anfitrión", "She is hosting a dinner party."], ["crowd", "multitud", "There was a big crowd."], ["fireworks", "fuegos artificiales", "We watched the fireworks."]]]
  ] }
);
const cefrCore = {
  A1: "be have do go come get make take give know want need like love live work study eat drink sleep wake up start finish open close help ask answer say tell see look hear listen speak read write understand use buy pay find put bring call feel try wait meet play watch walk run sit stand",
  A2: "agree decide explain remember forget choose change improve learn teach travel arrive leave return carry wear cook clean wash move visit invite enjoy happen plan hope believe worry seem become build break send receive spend save borrow lend order book miss lose win happen continue practise prepare repair share suggest offer promise invite describe compare collect follow check decide",
  B1: "achieve avoid manage require provide include develop reduce increase support accept refuse mention recommend replace depend involve create imagine solve recognise realise notice consider prefer encourage prevent allow complain apologise arrange attend apply deliver discuss expect express handle introduce organise participate perform publish remind respond review search select succeed suffer train",
  B2: "analyse assess assume clarify commit convince demonstrate establish estimate identify indicate interpret negotiate obtain perceive propose pursue reflect resolve retain reveal arise attribute contribute coordinate implement justify monitor overcome predict emphasise distinguish adapt advocate calculate collaborate confirm criticise debate eliminate ensure evaluate generate illustrate imply modify prioritise recommend"
    + "accomplish acquire administer alter anticipate assign compensate concentrate conduct confront consist constrain consult consume contradict convert cooperate decline derive detect distribute dominate draft edit enhance exceed expand facilitate formulate guarantee hesitate infer initiate inspect integrate interrupt investigate maintain manipulate motivate persuade process recover reinforce reject release restore restrict tolerate transform undertake verify withdraw"
    ,
  C1: "acknowledge articulate comprehend conceive contradict deduce differentiate elaborate envisage exacerbate facilitate fluctuate formulate hypothesise innovate integrate manipulate mediate mitigate reinforce scrutinise speculate substantiate transcend undermine utilise validate withdraw withhold anticipate circumvent consolidate constitute contemplate correlate deteriorate devise differentiate discriminate distort diversify eradicate evoke exacerbate exemplify exploit extract fluctuate foster generalise hinder inhibit induce infer inhibit invoke mediate merge offset prevail provoke reconcile rectify reinforce reiterate simulate"
};
const irregularForms = {
  be: ["be", "is", "was", "being"], have: ["have", "has", "had", "having"], do: ["do", "does", "did", "doing"],
  go: ["go", "goes", "went", "going"], come: ["come", "comes", "came", "coming"], get: ["get", "gets", "got", "getting"],
  make: ["make", "makes", "made", "making"], take: ["take", "takes", "took", "taking"], give: ["give", "gives", "gave", "giving"],
  know: ["know", "knows", "knew", "knowing"], see: ["see", "sees", "saw", "seeing"], say: ["say", "says", "said", "saying"],
  tell: ["tell", "tells", "told", "telling"], speak: ["speak", "speaks", "spoke", "speaking"], read: ["read", "reads", "read", "reading"],
  write: ["write", "writes", "wrote", "writing"], find: ["find", "finds", "found", "finding"], bring: ["bring", "brings", "brought", "bringing"],
  buy: ["buy", "buys", "bought", "buying"], pay: ["pay", "pays", "paid", "paying"], feel: ["feel", "feels", "felt", "feeling"],
  think: ["think", "thinks", "thought", "thinking"], leave: ["leave", "leaves", "left", "leaving"], lose: ["lose", "loses", "lost", "losing"],
  win: ["win", "wins", "won", "winning"], teach: ["teach", "teaches", "taught", "teaching"], learn: ["learn", "learns", "learnt", "learning"]
};
const verbForms = base => irregularForms[base] || (base.includes(" ") ? [base] : [base, `${base}s`, `${base}ed`, `${base}ing`]);
const generatedLexicon = Object.entries(cefrCore).flatMap(([level, words]) =>
  words.split(" ").flatMap(word => verbForms(word).map((form, index) => ({
    word: form, meaning: index === 0 ? `verbo: ${word}` : `forma de ${word}`,
    type: "verb", level, example: index === 3 ? `I am ${form} today.` : `I ${form} every day.`
  })))
);
const catalogFromTopics = vocabTopics.flatMap(topic => topic.sections.flatMap(([section, words]) =>
  words.map(([word, meaning, example], index) => ({
    word, meaning, example, topic: topic.title, section, level: ["A1", "A2", "B1", "B2", "C1"][index % 5],
    type: /^(reliable|outgoing|thoughtful|relieved|annoyed|grateful|tall|curly|casual|ripe|balanced|swollen|loose|durable|comfortable|affordable|humid|available|awkward|brilliant)$/.test(word) ? "adjective" : /ly$/.test(word) ? "adverb" : /^(in|on|at|for|from|to|with|by|of)$/.test(word) ? "preposition" : /^(follow up|figure out|check in|take off|look after)$/.test(word) ? "phrasal verb" : "noun"
  }))
));
const grammarLexicon = [
  ["always", "siempre", "I always practise in the morning", "adverb", "A1"], ["usually", "normalmente", "I usually walk to work.", "adverb", "A1"],
  ["often", "a menudo", "We often cook together.", "adverb", "A1"], ["already", "ya", "I have already finished.", "adverb", "A2"],
  ["carefully", "con cuidado", "Read the instructions carefully.", "adverb", "B1"], ["however", "sin embargo", "However, we decided to continue.", "adverb", "B1"],
  ["in", "en/dentro de", "I live in Madrid.", "preposition", "A1"], ["on", "en/sobre", "The meeting is on Monday.", "preposition", "A1"],
  ["at", "en/a", "Meet me at the station.", "preposition", "A1"], ["since", "desde", "I have worked here since June.", "preposition", "A2"],
  ["although", "aunque", "Although it was late, we continued.", "conjunction", "B1"], ["despite", "a pesar de", "Despite the rain, we went out.", "preposition", "B2"],
  ["reliable", "fiable", "She is a reliable colleague.", "adjective", "A2"], ["patient", "paciente", "You need to be patient.", "adjective", "A2"],
  ["confident", "seguro de sí mismo", "I feel more confident now.", "adjective", "B1"], ["effective", "eficaz", "This is an effective method.", "adjective", "B1"],
  ["challenging", "exigente", "The exercise was challenging.", "adjective", "B1"], ["outstanding", "excelente", "She did an outstanding job.", "adjective", "C1"],
  ["look after", "cuidar de", "Can you look after my dog?", "phrasal verb", "A2"], ["find out", "averiguar", "I need to find out the answer.", "phrasal verb", "A2"],
  ["carry on", "continuar", "Please carry on with your work.", "phrasal verb", "B1"], ["work out", "resolver / hacer ejercicio", "We will work out a solution.", "phrasal verb", "B1"],
  ["bring up", "mencionar / criar", "She brought up an important point.", "phrasal verb", "B2"], ["rule out", "descartar", "We cannot rule out that possibility.", "phrasal verb", "C1"]
].map(([word, meaning, example, type, level]) => ({ word, meaning, example, type, level }));
const vocabularyCatalog = [...catalogFromTopics, ...grammarLexicon, ...generatedLexicon];
const vocabularyPartOfSpeech = [
  ["all", "Todas"], ["noun", "Sustantivos"], ["verb", "Verbos"], ["adjective", "Adjetivos"],
  ["adverb", "Adverbios"], ["preposition", "Preposiciones"], ["phrasal verb", "Phrasal verbs"]
];
const vocabularyLevels = ["all", "A1", "A2", "B1", "B2", "C1"];
const getCatalogWord = word => vocabularyCatalog.find(item => item.word.toLowerCase() === word.toLowerCase());

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
const setView = (view, { replace = false } = {}) => {
  if (view !== currentView && !replace) viewHistory.push(currentView);
  currentView = view;
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === view));
  document.querySelector("#sidebar")?.classList.remove("open");
  document.querySelector("#menu-scrim")?.classList.remove("open");
  render();
  window.scrollTo(0, 0);
};
const goBack = () => setView(viewHistory.pop() || "home", { replace: true });
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
  { id: "shadowing", title: "Shadowing: ritmo natural", topic: "pronunciation", skill: "pronunciation", level: "B1", minutes: 10, description: "Escucha, pausa e imita una frase completa.", phrase: "Could you say that again, please?", tip: "Imita el ritmo y las pausas, no solo cada sonido por separado." },
  { id: "conditionals", title: "Condicionales para hablar con matices", topic: "grammar", skill: "grammar", level: "B2", minutes: 20, description: "Expresar posibilidades, consejos y consecuencias.", phrase: "If I had more time, I would practise every day.", tip: "If + pasado, would + verbo para imaginar situaciones." },
  { id: "nuance", title: "Sonar natural con colocaciones", topic: "conversation", skill: "vocabulary", level: "B2", minutes: 18, description: "Combinar palabras como lo hacen los hablantes.", phrase: "I strongly agree with your point.", tip: "Aprende bloques completos: strongly agree, make a decision, take a break." },
  { id: "formal-presentation", title: "Presentar una idea con claridad", topic: "work", skill: "speaking", level: "B2", minutes: 22, description: "Organizar una presentación y responder preguntas.", phrase: "Let me walk you through the main points.", tip: "Los conectores guían al oyente: first, however, as a result, finally." },
  { id: "advanced-argument", title: "Argumentar con precisión", topic: "conversation", skill: "speaking", level: "C1", minutes: 25, description: "Matizar opiniones y reconocer otros puntos de vista.", phrase: "That is a valid point; however, I would argue that...", tip: "Concede una parte antes de matizar: it is true that..., nevertheless..." },
  { id: "advanced-listening", title: "Escucha de ideas implícitas", topic: "media", skill: "listening", level: "C1", minutes: 25, description: "Detectar intención, ironía y opinión indirecta.", phrase: "I suppose that is one way of looking at it.", tip: "El significado depende del tono y del contexto, no solo de las palabras." }
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
const reviewDue = () => (state.reviewQueue || []).filter(item => !item.nextReview || item.nextReview <= todayKey());
const addReview = async (word, quality = 4) => {
  const intervals = [1, 2, 4, 8, 16, 30];
  const existing = state.reviewQueue.find(item => item.word === word);
  const level = existing ? Math.min((existing.level || 0) + (quality >= 3 ? 1 : -1), intervals.length - 1) : 0;
  const next = new Date();
  next.setDate(next.getDate() + intervals[Math.max(0, level)]);
  state.reviewQueue = [...(state.reviewQueue || []).filter(item => item.word !== word), { word, level: Math.max(0, level), nextReview: next.toISOString().slice(0, 10) }];
  await save();
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
  <div class="section-head"><h2>Organiza tu aprendizaje</h2></div><div class="card"><p class="muted">Haz el diagnóstico para ajustar tu nivel o activa un recordatorio para no perder tu hábito.</p><button class="btn secondary" data-action="start-diagnostic">Repetir diagnóstico</button><button class="btn secondary" data-action="notification" style="margin-left:8px">Activar recordatorios</button></div>
  ${reviewDue().length ? `<div class="section-head"><h2>Repasos pendientes</h2></div><div class="card"><p>Tu memoria tiene ${reviewDue().length} elemento${reviewDue().length === 1 ? "" : "s"} listo${reviewDue().length === 1 ? "" : "s"} para repasar.</p><button class="btn secondary" data-view="vocabulary">Repasar ahora →</button></div>` : ""}
  <div class="section-head"><h2>Tu progreso</h2><button class="btn secondary" data-view="progress">Ver detalles</button></div>
  <div class="stats"><div class="stat"><span>Racha actual</span><strong>${state.streak} 🔥</strong><span>¡Sigue así!</span></div><div class="stat"><span>Palabras activas</span><strong>${state.words}</strong><span>+4 esta semana</span></div><div class="stat"><span>Objetivo mensual</span><strong>${state.goalProgress}%</strong><div class="progress-bar"><i style="width:${state.goalProgress}%"></i></div></div></div>
  <div class="section-head"><h2>Tu menú de aprendizaje</h2></div><div class="cards">
  <div class="lesson-card"><div class="lesson-icon">🎧</div><h3>Escucha y entiende</h3><p class="muted">Un diálogo de la vida real con audio lento y natural.</p><button class="btn secondary" data-action="listen">Practicar escucha</button></div>
  <div class="lesson-card"><div class="lesson-icon">💬</div><h3>Habla sin miedo</h3><p class="muted">Responde en voz alta y recibe una corrección amable.</p><button class="btn secondary" data-action="speak">Practicar conversación</button></div>
  <div class="lesson-card"><div class="lesson-icon">🧠</div><h3>Repasa lo importante</h3><p class="muted">Tu memoria sabe cuándo necesitas volver a ver cada palabra.</p><button class="btn secondary" data-view="vocabulary">Repasar palabras</button></div>
  <div class="lesson-card"><div class="lesson-icon">✎</div><h3>Practica con ejercicios</h3><p class="muted">Traduce, completa y ordena frases por nivel y categoría.</p><button class="btn secondary" data-view="practice">Practicar palabras</button></div></div>`;
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
  const related = vocabularyCatalog.filter(word => item.phrase.toLowerCase().includes(word.word.toLowerCase())).slice(0, 4);
  content.innerHTML = `<div class="quiz"><button class="pill-button" data-view="home">← Mi ruta</button><div class="eyebrow" style="margin-top:22px">${item.level} · ${item.minutes} min · ${item.skill}</div><h1>${item.title}</h1><p class="muted">${item.description}</p><div class="card"><span class="tag">Regla útil</span><h3>${item.tip}</h3><p class="muted">Palabras conectadas: ${related.length ? related.map(word => `<button class="word-chip" data-action="save-word" data-word="${escapeHtml(word.word)}">${escapeHtml(word.word)}</button>`).join(" ") : "guarda los términos nuevos de esta frase."}</p><hr><h2 class="selectable-phrase">${item.phrase.split(" ").map(word => `<button class="word-chip" data-action="save-word" data-word="${word.replace(/[?.!,]/g, "")}">${word}</button>`).join(" ")}</h2>${audioPlayer(item.phrase)}<p class="muted small">Escucha, repite y pulsa cualquier palabra para guardarla.</p><div class="card"><span class="tag">Comprobación rápida</span><h3>¿La frase anterior tiene un verbo conjugado?</h3><button class="option" data-answer="right">Sí, “${item.phrase.split(" ")[1] || "work"}” forma parte de la acción.</button><button class="option" data-answer="wrong">No, una frase en inglés no necesita verbo.</button></div><label style="margin-top:16px">Escribe una frase parecida<textarea id="writing-answer" placeholder="Escribe aquí tu ejemplo en inglés..."></textarea></label><button class="btn secondary" data-action="check-writing" data-expected="${item.phrase}">Corregir mi frase</button><div id="writing-feedback"></div><h3>Mini reto</h3><p>Construye o di una frase parecida usando este patrón en tu vida real.</p><button class="btn" data-action="complete-lesson" data-lesson="${item.id}">He practicado esta lección ✓</button></div></div>`;
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
function vocabulary() {
  const saved = state.vocabulary || [];
  content.innerHTML = `<div class="eyebrow">Tu memoria inteligente</div><h1>Mi vocabulario</h1><p class="muted">Tus palabras guardadas vuelven con intervalos cada vez más largos.</p><div class="card"><p><strong>${saved.length}</strong> palabras guardadas · <strong>${reviewDue().length}</strong> repasos pendientes</p>${saved.length ? saved.map(v => `<div class="word"><div><h3>${escapeHtml(v.word)} <span class="tag">${escapeHtml(v.type || "expresión")}</span></h3><small>${escapeHtml(v.meaning)} · “${escapeHtml(v.example)}”</small></div><div><button class="pill-button" data-action="audio" data-text="${escapeHtml(v.example)}">🔊</button><button class="pill-button" data-action="review-word" data-word="${escapeHtml(v.word)}">Lo sé</button></div></div>`).join("") : `<p class="muted">Guarda palabras desde cualquier tema para empezar tu lista.</p>`}</div>`;
}
function practice() {
  const filters = state.practiceFilters || { level: "all", type: "all" };
  const pool = vocabularyCatalog.filter(item => (filters.level === "all" || item.level === filters.level) && (filters.type === "all" || item.type === filters.type));
  const item = pool[(state.practiceIndex || 0) % Math.max(pool.length, 1)] || vocabularyCatalog[0];
  const prompt = state.practiceMode || "translation";
  const answer = prompt === "translation" ? item.meaning : prompt === "fill" ? item.word : item.example.split(" ").map(word => word.replace(/[.,!?]/g, "")).sort(() => .5 - Math.random());
  content.innerHTML = `<div class="quiz"><div class="eyebrow">Práctica activa · ${vocabularyCatalog.length}+ entradas</div><h1>Practicar palabras</h1><p class="muted">Elige nivel y categoría. Las respuestas fallidas pasan automáticamente a tu repaso.</p><div class="filter-grid"><select data-practice-level>${vocabularyLevels.map(level => `<option value="${level}" ${filters.level === level ? "selected" : ""}>${level === "all" ? "Todos los niveles" : level}</option>`).join("")}</select><select data-practice-type>${vocabularyPartOfSpeech.map(([value, label]) => `<option value="${value}" ${filters.type === value ? "selected" : ""}>${label}</option>`).join("")}</select><select data-practice-mode><option value="translation" ${prompt === "translation" ? "selected" : ""}>Traducción</option><option value="fill" ${prompt === "fill" ? "selected" : ""}>Completar frase</option><option value="order" ${prompt === "order" ? "selected" : ""}>Ordenar palabras</option></select></div><div class="card"><span class="tag">${item.level} · ${item.type}</span><h2>${prompt === "translation" ? `¿Qué significa “${item.word}”?` : prompt === "fill" ? item.example.replace(new RegExp(item.word, "i"), "_____") : "Ordena las palabras para formar la frase"}</h2>${prompt === "order" ? `<p id="order-answer" class="selectable-phrase">${(state.orderAttempt || []).map(escapeHtml).join(" ") || "Pulsa cada palabra en orden"}</p><div class="word-order">${answer.map((word, index) => `<button data-order-word="${index}" data-word="${escapeHtml(word)}">${escapeHtml(word)}</button>`).join("")}</div><button class="btn" data-action="check-practice-order" data-expected="${escapeHtml(item.example)}">Comprobar frase</button>` : `<div class="exercise-answer"><input id="practice-answer" autocomplete="off" placeholder="${prompt === "translation" ? "Escribe la traducción..." : "Escribe la palabra que falta..."}"><button class="btn" data-action="check-practice" data-answer="${escapeHtml(answer)}" data-word="${escapeHtml(item.word)}">Comprobar</button></div>`}<div id="practice-feedback"></div>${audioPlayer(item.example)}<button class="pill-button" data-action="save-word" data-word="${escapeHtml(item.word)}">♡ Guardar palabra</button></div></div>`;
}
function vocabularyTopics() { content.innerHTML = `<div class="eyebrow">Palabras que puedes usar</div><h1>Vocabulario por temas</h1><p class="muted">Cada tema tiene subcategorías para avanzar desde lo básico hasta situaciones reales.</p><div class="cards">${vocabTopics.map(t => `<div class="card vocab-topic"><div class="lesson-icon">${t.icon}</div><div><h3>${t.title}</h3><p class="muted">${t.sections.length} subtemas · ${t.sections.reduce((sum, s) => sum + s[1].length, 0)} palabras</p><button class="btn secondary" data-vocab-topic="${t.id}">Ver subtemas →</button></div></div>`).join("")}</div>`; }
function vocabularyTopic(id) { const topic = vocabTopics.find(t => t.id === id) || vocabTopics[0]; content.innerHTML = `<div class="quiz"><button class="pill-button" data-view="vocabularyTopics">← Todos los temas</button><div class="eyebrow" style="margin-top:22px">${topic.icon} Vocabulario</div><h1>${topic.title}</h1><p class="muted">${topic.description} Elige una subcategoría para ver palabras, ejemplos y audio.</p><div class="cards">${topic.sections.map(([title, words], index) => `<div class="card"><span class="tag">Subtema ${index + 1}</span><h3>${title}</h3><p class="muted">${words.length} palabras prácticas</p><button class="btn secondary" data-vocab-section="${topic.id}|${index}">Abrir subtema →</button></div>`).join("")}</div></div>`; }
function vocabularySection(topicId, index) { const topic = vocabTopics.find(t => t.id === topicId) || vocabTopics[0]; const [title, words] = topic.sections[Number(index)] || topic.sections[0]; content.innerHTML = `<div class="quiz"><button class="pill-button" data-vocab-topic="${topic.id}">← ${topic.title}</button><div class="eyebrow" style="margin-top:22px">${topic.icon} ${topic.title}</div><h1>${title}</h1><p class="muted">Escucha, mira el ejemplo y guarda lo que quieras repasar.</p><div class="card">${words.map(([word, meaning, example]) => `<div class="word"><div><h3>${word} <span class="tag">${meaning}</span></h3><small>“${example}”</small></div><div><button class="pill-button" data-action="audio" data-text="${example}">🔊</button><button class="pill-button" data-action="save-word" data-word="${word}">♡ Guardar</button></div></div>`).join("")}</div></div>`; }
function library() { content.innerHTML = `<div class="eyebrow">Aprende a tu manera</div><h1>Lecciones sueltas</h1><p class="muted">Elige cualquier lección sin cambiar tu ruta diaria. La práctica se guardará igualmente.</p><div class="cards">${curriculum.map(item => `<div class="card"><span class="tag">${item.level} · ${item.minutes} min</span><h3>${item.title}</h3><p class="muted">${item.description}</p><button class="btn secondary" data-lesson="${item.id}">Hacer lección →</button></div>`).join("")}</div>`; }
function progress() { const skills = Object.entries(state.skills || {}); content.innerHTML = `<div class="eyebrow">Mira cómo avanzas</div><h1>Tu progreso real</h1><p class="muted">Bimba ajusta tus siguientes lecciones según lo que practicas y completas.</p><div class="card"><h2>Habilidades</h2>${skills.map(([key, value]) => `<div style="margin:16px 0"><div style="display:flex;justify-content:space-between"><strong>${({ grammar: "Gramática", vocabulary: "Vocabulario", listening: "Escucha", speaking: "Conversación", pronunciation: "Pronunciación" })[key] || key}</strong><span>${value}%</span></div><div class="progress-bar"><i style="width:${value}%"></i></div></div>`).join("")}</div><div class="section-head"><h2>Tu consejo de hoy</h2></div><div class="card"><h3>💡 Aprende en frases, no en listas</h3><p class="muted">Cuando guardes una palabra, practica también una frase propia. Así tu cerebro aprende cuándo y cómo usarla.</p></div>`; }
function week() { const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]; const lessons = curriculum.slice(0, 7); content.innerHTML = `<div class="eyebrow">Tu calendario</div><h1>Plan de esta semana</h1><p class="muted">Si un día no estudias, la lección no desaparece: queda pendiente y se recoloca en tu ruta.</p><div class="week-grid">${days.map((day, i) => { const item = lessons[i]; const done = item && (state.completed || []).includes(item.id); return `<div class="card week-day"><span class="tag">${day}</span><h3>${item ? item.title : "Repaso libre"}</h3><p class="muted">${item ? `${item.minutes} min · ${item.level}` : "Vocabulario y errores"}</p><span class="${done ? "done" : "pending"}">${done ? "✓ Completada" : "Pendiente"}</span>${item && !done ? `<button class="pill-button" data-lesson="${item.id}">Hacer</button>` : ""}</div>`; }).join("")}</div>`; }
async function uploadAvatar(file) {
  if (!currentSession || !supabaseClient) return null;
  const path = `${currentSession.user.id}/avatar-${Date.now()}.${file.name.split(".").pop() || "jpg"}`;
  const upload = await supabaseClient.storage.from("avatars").upload(path, file, { upsert: true, contentType: file.type });
  if (upload.error) { toast(`No se pudo sincronizar la foto: ${upload.error.message}`); return null; }
  const signed = await supabaseClient.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24 * 365);
  if (signed.error) { toast(`No se pudo obtener la foto: ${signed.error.message}`); return null; }
  return signed.data.signedUrl;
}
function profile() { const u = state.user || {}; content.innerHTML = `<div class="onboarding"><div class="card"><div class="eyebrow">Tu perfil</div><h1>Hazlo tuyo</h1><p class="muted">Tu username y avatar aparecerán en tu experiencia Bimba.</p><form id="profile-form"><div class="form-grid"><label>Username<input name="username" value="${escapeHtml(u.username)}" required pattern="[A-Za-z0-9_]{3,20}" placeholder="ej. lour_english"></label><label>Tu nombre<input name="name" value="${escapeHtml(u.name)}" required placeholder="¿Cómo te llamas?"></label><label>Tu nivel aproximado<select name="level"><option ${u.level === "A1-A2" ? "selected" : ""}>A1-A2</option><option ${u.level === "B1-B2" ? "selected" : ""}>B1-B2</option><option ${u.level === "C1-C2" ? "selected" : ""}>C1-C2</option></select></label><label>Foto de perfil<input name="avatar" type="file" accept="image/*"></label></div><div class="avatar-preview">${u.avatar ? `<img src="${u.avatar}" alt="Tu foto de perfil">` : "🐼"}</div><label style="margin-top:17px">¿Cuánto tiempo quieres estudiar al día?</label><select name="dailyMinutes"><option value="10" ${u.dailyMinutes === "10" ? "selected" : ""}>10 minutos · hábito ligero</option><option value="15" ${!u.dailyMinutes || u.dailyMinutes === "15" ? "selected" : ""}>15 minutos · constante</option><option value="30" ${u.dailyMinutes === "30" ? "selected" : ""}>30 minutos · avance rápido</option><option value="45" ${u.dailyMinutes === "45" ? "selected" : ""}>45 minutos · intensivo</option></select><label style="margin-top:17px">¿Para qué quieres usar el inglés? <span class="muted">(puedes elegir varias)</span></label><div class="checkboxes">${["Trabajo", "Viajar", "Series y ocio", "Exámenes", "Conversación"].map(x => `<label class="check"><input type="checkbox" name="goals" value="${x}" ${(u.goals || []).includes(x) ? "checked" : ""}>${x}</label>`).join("")}</div><label style="margin-top:17px">¿En qué trabajas y qué haces? (opcional)<textarea name="job" placeholder="Ej.: Soy diseñadora y hablo con clientes internacionales...">${escapeHtml(u.job)}</textarea></label><button class="btn" type="submit">Guardar mi perfil</button></form></div></div>`; document.querySelector("#profile-form").addEventListener("submit", async e => { e.preventDefault(); const f = new FormData(e.target); const file = f.get("avatar"); let avatar = u.avatar || ""; if (file?.size) { if (file.size > 1500000) return toast("La foto debe pesar menos de 1,5 MB."); avatar = await uploadAvatar(file); if (!avatar && !currentSession) avatar = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); }); } state.user = { username: f.get("username"), name: f.get("name"), level: f.get("level"), dailyMinutes: f.get("dailyMinutes"), job: f.get("job"), goals: f.getAll("goals"), avatar }; ensurePlan(); await save(); toast("Perfil guardado. Tu plan adaptativo está listo."); setView("home"); }); }
function diagnostic() { const questions = [
  ["grammar", "Elige la frase correcta:", ["She work from home.", "She works from home."], 1],
  ["grammar", "Completa: I’m interested ___ learning English.", ["on", "in", "at"], 1],
  ["vocabulary", "¿Qué significa “I have been working here for two years”?", ["Trabajo aquí desde hace dos años.", "Trabajé aquí hace dos años."], 0],
  ["grammar", "Completa: I ___ to the gym yesterday.", ["go", "went", "have gone"], 1],
  ["writing", "Elige la opción natural:", ["I am agree.", "I agree.", "I have agree."], 1],
  ["grammar", "Completa: She is ___ than her brother.", ["more tall", "taller", "tallest"], 1],
  ["listening", "Escucha y elige el significado.", ["Ya he terminado.", "Terminaré mañana.", "Todavía no termino."], 0, "I’ve already finished."],
  ["grammar", "Completa: If I had time, I ___ travel more.", ["will", "would", "am"], 1],
  ["writing", "Elige el conector correcto: It was difficult; ___, we finished.", ["however", "because", "so that"], 0],
  ["vocabulary", "¿Qué expresa “I suppose that is one way of looking at it”?", ["Un acuerdo directo.", "Una opinión matizada.", "Una dirección."], 1],
  ["pronunciation", "¿Dónde recae el acento principal en “photography”?", ["PHO-to-graphy", "pho-TOG-ra-phy", "photo-GRA-PHY"], 1],
  ["listening", "Escucha y elige lo que oyes.", ["The deadline is Friday.", "The online is Friday.", "The deadline was frightening."], 0, "The deadline is Friday."]
]; const index = state.diagnostic?.index || 0; if (index >= questions.length) return diagnosticResult(); const [skill, q, options, answer, spoken] = questions[index]; content.innerHTML = `<div class="quiz"><div class="eyebrow">Diagnóstico ${index + 1} de ${questions.length}</div><h1>Descubramos tu punto de partida</h1><p class="muted">Incluye gramática, vocabulario, escritura y muestras orientativas de escucha y pronunciación.</p><div class="progress-bar"><i style="width:${(index / questions.length) * 100}%"></i></div><div class="card"><span class="tag">${skill}</span><h2>${q}</h2>${spoken ? audioPlayer(spoken) : ""}${options.map((o, i) => `<button class="option" data-diagnostic="${i}" data-skill="${skill}" data-answer="${answer === i ? "right" : "wrong"}">${o}</button>`).join("")}</div></div>`; }
function diagnosticResult() { const score = state.diagnostic?.score || 0; const level = score <= 4 ? "A1-A2" : score <= 8 ? "B1-B2" : "C1-C2"; const detail = score <= 4 ? "Base A1-A2" : score <= 8 ? "Intermedio B1-B2" : "Avanzado C1-C2"; const breakdown = Object.entries(state.diagnostic?.skills || {}).map(([key, value]) => `<span class="tag">${key}: ${value}</span>`).join(" "); content.innerHTML = `<div class="onboarding"><div class="card"><div class="eyebrow">Diagnóstico completado · ${score}/12</div><h1>Tu punto de partida: ${detail}</h1><p class="muted">Es una estimación orientativa, no una certificación oficial. Escucha y pronunciación dependen del navegador y sirven para recomendar práctica.</p><p>${breakdown}</p><button class="btn" data-action="apply-level" data-level="${level}">Usar este nivel</button></div></div>`; }
function auth() { content.innerHTML = `<div class="onboarding"><div class="card"><div class="eyebrow">Sincronización segura</div><h1>${currentSession ? "Tu cuenta Bimba" : "Guarda tu progreso en la nube"}</h1><p class="muted">${currentSession ? `Sesión iniciada como ${escapeHtml(currentSession.user.email)}.` : "Usa el mismo progreso en tu ordenador y en tu iPhone. No necesitas tarjeta."}</p>${currentSession ? `<button class="btn secondary" data-action="logout">Cerrar sesión</button>` : `<form id="auth-form"><label>Email<input name="email" type="email" required autocomplete="email" placeholder="tu@email.com"></label><label style="margin-top:14px">Contraseña<input name="password" type="password" minlength="6" required autocomplete="new-password" placeholder="Mínimo 6 caracteres"></label><div style="display:flex;gap:10px;margin-top:18px;flex-wrap:wrap"><button class="btn" data-auth="signup">Crear cuenta</button><button class="btn secondary" data-auth="login">Iniciar sesión</button></div></form><button class="pill-button" data-action="forgot-password" style="margin-top:16px">He olvidado mi contraseña</button><p class="muted" style="margin-top:18px;font-size:12px">Tu email solo se usa para iniciar sesión. Nunca compartas tu contraseña.</p>`}</div></div>`; if (!currentSession) document.querySelector("#auth-form").addEventListener("submit", async e => { e.preventDefault(); const button = e.submitter; const f = new FormData(e.target); await authenticate(button.dataset.auth, f.get("email"), f.get("password")); }); }
async function authenticate(action, email, password) { if (!supabaseClient) return toast("No se ha podido cargar el servicio de sincronización."); const result = action === "signup" ? await supabaseClient.auth.signUp({ email, password, options: { emailRedirectTo: APP_URL } }) : await supabaseClient.auth.signInWithPassword({ email, password }); if (result.error) return toast(result.error.message); if (result.data.session) { await loadCloudState(result.data.session); setView("home"); } else toast("Revisa tu email para confirmar la cuenta y después inicia sesión."); }
async function requestPasswordReset() { const email = window.prompt("Escribe el email de tu cuenta Bimba:"); if (!email) return; const result = await supabaseClient?.auth.resetPasswordForEmail(email, { redirectTo: APP_URL }); if (result?.error) return toast(result.error.message); toast("Te hemos enviado un enlace para cambiar la contraseña."); }
function resetPassword() { content.innerHTML = `<div class="onboarding"><div class="card"><div class="eyebrow">Recuperar contraseña</div><h1>Elige una contraseña nueva</h1><form id="reset-form"><label>Nueva contraseña<input name="password" type="password" minlength="6" required autocomplete="new-password"></label><button class="btn" style="margin-top:18px">Guardar contraseña</button></form></div></div>`; document.querySelector("#reset-form").addEventListener("submit", async event => { event.preventDefault(); const password = new FormData(event.target).get("password"); const result = await supabaseClient.auth.updateUser({ password }); if (result.error) return toast(result.error.message); toast("Contraseña actualizada."); setView("auth"); }); }
function speaking() { const prompt = "Could you tell me about your day?"; content.innerHTML = `<div class="quiz"><div class="eyebrow">Hablar y pronunciar</div><h1>Practica una respuesta real</h1><p class="muted">Escucha el modelo, grábate y compara la transcripción cuando tu navegador lo permita.</p><div class="card"><span class="tag">A2-B1 · conversación</span><h2>${prompt}</h2>${audioPlayer(prompt)}<button class="btn" data-action="record">🎙 Empezar grabación</button><button class="btn secondary" data-action="stop-record" style="margin-left:8px">Detener</button><div id="recording-status" class="recording-status"></div><div id="transcript" class="transcript">La transcripción aparecerá aquí si Safari o tu navegador la admite.</div><p class="muted small">La puntuación es orientativa: no sustituye a un profesor ni a una prueba oficial.</p></div></div>`; }
function onboarding() { content.innerHTML = `<div class="onboarding"><div class="card"><div class="eyebrow">Bienvenida a Bimba English</div><h1>Aprende inglés para tu vida real.</h1><p class="muted">Lecciones adaptadas a tu nivel, tus objetivos y lo que haces cada día.</p><div class="notice">Puedes crear tu perfil y hacer un diagnóstico corto. Después Bimba preparará tu ruta diaria.</div><button class="btn" data-action="setup">Crear mi perfil →</button><button class="btn secondary" data-action="start-diagnostic" style="margin-left:8px">Hacer diagnóstico</button></div></div>`; }
function render() { if (!state.user && currentView === "home") return onboarding(); ({ home, learn, series, vocabulary, vocabularyTopics, vocabularyTopic, library, progress, week, profile, auth, diagnostic, practice, speaking, resetPassword }[currentView] || home)(); }

document.querySelector("#main-nav").addEventListener("click", e => { const button = e.target.closest("[data-view]"); if (button) setView(button.dataset.view); });
document.querySelector("#profile-button").addEventListener("click", () => setView("profile"));
document.querySelector("#auth-button").addEventListener("click", () => setView("auth"));
document.querySelector("#back-button").addEventListener("click", goBack);
document.querySelector("#menu-button").addEventListener("click", () => { document.querySelector("#sidebar")?.classList.add("open"); document.querySelector("#menu-scrim")?.classList.add("open"); });
document.querySelector("#menu-scrim").addEventListener("click", () => { document.querySelector("#sidebar")?.classList.remove("open"); document.querySelector("#menu-scrim")?.classList.remove("open"); });
document.addEventListener("click", async e => {
  const view = e.target.closest("[data-view]"); if (view) return setView(view.dataset.view);
  const topicId = e.target.closest("[data-topic]")?.dataset.topic; if (topicId) return topic(topicId);
  const vocabId = e.target.closest("[data-vocab-topic]")?.dataset.vocabTopic; if (vocabId) return vocabularyTopic(vocabId);
  const vocabSection = e.target.closest("[data-vocab-section]")?.dataset.vocabSection; if (vocabSection) { const [topicId, index] = vocabSection.split("|"); return vocabularySection(topicId, index); }
  const seriesId = e.target.closest("[data-series]")?.dataset.series; if (seriesId) return seriesScene(seriesId);
  const lessonId = e.target.closest("[data-lesson]")?.dataset.lesson;
  if (lessonId && !e.target.closest("[data-action=complete-lesson]")) return lesson(lessonId);
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (e.target.closest("#theme-button")) {
    const menu = document.querySelector(".theme-menu");
    if (menu) return menu.remove();
    const themes = ["pink", "red", "blue", "green", "purple", "orange", "yellow"];
    document.body.insertAdjacentHTML("beforeend", `<div class="theme-menu">${themes.map(theme => `<button class="theme-swatch" data-theme="${theme}" aria-label="${theme}"></button>`).join("")}</div>`);
    return;
  }
  const selectedTheme = e.target.closest(".theme-swatch")?.dataset.theme;
  if (selectedTheme) { document.documentElement.dataset.theme = selectedTheme === "pink" ? "" : selectedTheme; localStorage.setItem("bimba-theme", selectedTheme); document.querySelector(".theme-menu")?.remove(); return; }
  if (action === "setup") return setView("profile");
  if (action === "forgot-password") return requestPasswordReset();
  if (action === "record") {
    const status = document.querySelector("#recording-status");
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!navigator.mediaDevices?.getUserMedia && !Recognition) return toast("Este navegador no permite usar el micrófono.");
    if (Recognition) {
      activeRecognition = new Recognition();
      activeRecognition.lang = "en-US";
      activeRecognition.interimResults = false;
      activeRecognition.onresult = event => { const transcript = event.results[0][0].transcript; document.querySelector("#transcript").textContent = `Has dicho: ${transcript}`; state.skills.speaking = Math.min(100, (state.skills.speaking || 0) + 2); save(); };
      activeRecognition.onerror = event => { if (status) status.textContent = `No se pudo transcribir: ${event.error}.`; };
      activeRecognition.start();
    }
    if (navigator.mediaDevices?.getUserMedia && window.MediaRecorder) {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      activeRecorder = new MediaRecorder(stream);
      activeRecorder.onstop = () => stream.getTracks().forEach(track => track.stop());
      activeRecorder.start();
    }
    if (status) status.textContent = "Grabando… responde en inglés y pulsa Detener.";
    return;
  }
  if (action === "stop-record") {
    activeRecognition?.stop();
    if (activeRecorder?.state === "recording") activeRecorder.stop();
    activeRecognition = null;
    activeRecorder = null;
    const status = document.querySelector("#recording-status");
    if (status) status.textContent = "Grabación terminada.";
    return;
  }
  if (action === "logout") { await supabaseClient?.auth.signOut(); currentSession = null; setStatus("Guardado en este dispositivo"); toast("Sesión cerrada."); return setView("home"); }
  if (action === "lesson") return setView("learn");
  if (action === "listen" || action === "speak") return setView("speaking");
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
      const catalogWord = getCatalogWord(word);
      state.vocabulary.unshift(catalogWord ? { ...catalogWord } : { word, meaning: "expresión guardada", type: "expresión", example: word });
      state.words++;
    }
    await addReview(word);
    return toast("Expresión guardada en tu vocabulario.");
  }
  if (action === "review-word") {
    await addReview(e.target.closest("[data-action=review-word]").dataset.word, 4);
    return toast("¡Bien! Volveremos a repasarla más adelante.");
  }
  if (action === "check-writing") {
    const answer = document.querySelector("#writing-answer")?.value.trim();
    const feedback = document.querySelector("#writing-feedback");
    if (!answer) return toast("Escribe primero una frase.");
    const hasSubject = /\b(i|you|he|she|we|they)\b/i.test(answer);
    const hasVerb = /\b(am|is|are|work|works|have|has|do|does|go|goes|like|likes|can|will)\b/i.test(answer);
    const commonFix = answer.replace(/\bI am agree\b/gi, "I agree").replace(/\binterested on\b/gi, "interested in").replace(/\bmore tall\b/gi, "taller");
    const changed = commonFix !== answer;
    feedback.innerHTML = `<div class="notice">${hasSubject && hasVerb ? `✅ Buena base: hay sujeto y verbo.${changed ? ` Una corrección frecuente sería: <strong>${escapeHtml(commonFix)}</strong>.` : " Revisa ahora el orden y los detalles."}` : "💡 Te falta una pieza: intenta incluir quién hace la acción y un verbo conjugado."}</div>`;
    if (!hasSubject || !hasVerb || changed) state.errors = [...new Set([...state.errors, changed ? `escritura: ${answer}` : "construcción de frases"])];
    await save();
    return;
  }
  if (action === "apply-level") {
    state.user = { ...(state.user || {}), level: e.target.closest("[data-action=apply-level]").dataset.level };
    state.diagnostic = null;
    ensurePlan();
    await save();
    return setView("home");
  }
  if (action === "start-diagnostic") { state.diagnostic = { index: 0, score: 0, skills: {} }; return setView("diagnostic"); }
  if (action === "check-practice") {
    const button = e.target.closest("[data-action=check-practice]");
    const answer = document.querySelector("#practice-answer")?.value.trim().toLowerCase();
    const expected = button.dataset.answer.trim().toLowerCase();
    const feedback = document.querySelector("#practice-feedback");
    const correct = answer === expected;
    if (!correct) {
      state.errors = [...new Set([...(state.errors || []), `vocabulario: ${button.dataset.word}`])];
      addReview(button.dataset.word, 1);
    } else addReview(button.dataset.word, 4);
    feedback.innerHTML = `<div class="feedback ${correct ? "" : "error"}">${correct ? "✅ Correcto. La recuperación activa ayuda a fijarlo." : `💡 La respuesta era “${escapeHtml(button.dataset.answer)}”. La añadimos a tus repasos.`}</div>`;
    state.practiceIndex = (state.practiceIndex || 0) + 1;
    await save();
    return;
  }
  if (action === "check-practice-order") {
    const button = e.target.closest("[data-action=check-practice-order]");
    const words = state.orderAttempt || [];
    const expected = button.dataset.expected.toLowerCase().replace(/[.,!?]/g, "");
    const correct = words.join(" ").toLowerCase() === expected;
    const feedback = document.querySelector("#practice-feedback");
    if (!correct) state.errors = [...new Set([...(state.errors || []), `orden de frase: ${expected}`])];
    feedback.innerHTML = `<div class="feedback ${correct ? "" : "error"}">${correct ? "✅ Frase correcta." : `💡 Orden recomendado: “${escapeHtml(button.dataset.expected)}”`}</div>`;
    state.practiceIndex = (state.practiceIndex || 0) + 1;
    state.orderAttempt = [];
    await save();
    return;
  }
  if (e.target.closest("[data-order-word]")) {
    const wordButton = e.target.closest("[data-order-word]");
    state.orderAttempt = [...(state.orderAttempt || []), wordButton.dataset.word];
    wordButton.disabled = true;
    const answer = document.querySelector("#order-answer");
    if (answer) answer.textContent = state.orderAttempt.join(" ");
    return;
  }
  if (action === "notification") {
    if (!("Notification" in window)) return toast("Este navegador no admite notificaciones.");
    const permission = await Notification.requestPermission();
    return toast(permission === "granted" ? "Recordatorios activados en este navegador." : "Notificaciones no activadas.");
  }
  if (action === "complete-lesson") return completeLesson(e.target.closest("[data-action=complete-lesson]").dataset.lesson);
  if (action === "review") return toast("Repaso programado para dentro de 2 días.");
  if (action === "series") return toast("Lección de escena abierta: audio, subtítulos y ejercicios.");
  const answer = e.target.closest("[data-answer]")?.dataset.answer;
  if (e.target.closest("[data-diagnostic]")) {
    const diagnosticAnswer = e.target.closest("[data-diagnostic]");
    const skill = diagnosticAnswer.dataset.skill || "grammar";
    const skills = { ...(state.diagnostic?.skills || {}), [skill]: (state.diagnostic?.skills?.[skill] || 0) + (diagnosticAnswer.dataset.answer === "right" ? 1 : 0) };
    state.diagnostic = { index: (state.diagnostic?.index || 0) + 1, score: (state.diagnostic?.score || 0) + (diagnosticAnswer.dataset.answer === "right" ? 1 : 0), skills };
    return render();
  }
  if (answer === "right") { state.lessons++; state.goalProgress = Math.min(100, state.goalProgress + 4); await save(); toast("¡Muy bien! Recuperación activa completada."); render(); }
  else if (answer === "wrong") toast("Casi. Escucha la frase una vez más.");
});
document.addEventListener("change", async e => {
  if (!["practice-level", "practice-type", "practice-mode"].some(name => e.target.matches(`[data-${name}]`))) return;
  state.practiceFilters = { level: document.querySelector("[data-practice-level]")?.value || "all", type: document.querySelector("[data-practice-type]")?.value || "all" };
  state.practiceMode = document.querySelector("[data-practice-mode]")?.value || "translation";
  state.practiceIndex = 0;
  state.orderAttempt = [];
  render();
});

if (supabaseClient) supabaseClient.auth.getSession().then(({ data }) => { if (data.session) loadCloudState(data.session); });
if (supabaseClient) supabaseClient.auth.onAuthStateChange((event, session) => { if (event === "PASSWORD_RECOVERY") return setView("resetPassword"); if (session) loadCloudState(session); });
document.documentElement.dataset.theme = localStorage.getItem("bimba-theme") === "pink" ? "" : (localStorage.getItem("bimba-theme") || "");
render();
