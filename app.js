const KEY = "bimba-english-state";
const initialState = {
  user: null, streak: 3, lessons: 1, words: 24, goalProgress: 18, completed: [], plan: null, diagnostic: null,
  achievements: [], lessonStep: 0, topicProgress: {},
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
const PUSH_PUBLIC_KEY = window.BIMBA_SUPABASE?.pushPublicKey || "";
let state = JSON.parse(localStorage.getItem(KEY) || "null") || structuredClone(initialState);
let currentView = "home";
let viewHistory = [];
let currentSession = null;
let saveTimer;
let activeSpeech = null;
let speechRate = 0.86;
let activeRecorder = null;
let activeRecognition = null;
state = { ...structuredClone(initialState), ...state, skills: { ...initialState.skills, ...(state.skills || {}) }, topicProgress: state.topicProgress || {}, reviewQueue: state.reviewQueue || [], errors: state.errors || [] };
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
const generatedLexicon = [];
const catalogFromTopics = vocabTopics.flatMap(topic => topic.sections.flatMap(([section, words]) =>
  words.map(([word, meaning, example], index) => ({
    word, meaning, example, topic: topic.title, section, level: ["A1", "A2", "B1", "B2", "C1"][index % 5],
    type: /^(reliable|outgoing|thoughtful|relieved|annoyed|grateful|tall|curly|casual|ripe|balanced|swollen|loose|durable|comfortable|affordable|humid|available|awkward|brilliant)$/.test(word) ? "adjective" : /ly$/.test(word) ? "adverb" : /^(in|on|at|for|from|to|with|by|of)$/.test(word) ? "preposition" : /^(follow up|figure out|check in|take off|look after)$/.test(word) ? "phrasal verb" : "noun"
  }))
));
const curatedLexicon = [
  ["be", "ser / estar", "verb", "A1", "I am ready to start."],
  ["have", "tener", "verb", "A1", "I have a meeting at nine."],
  ["do", "hacer", "verb", "A1", "What do you do at weekends?"],
  ["go", "ir", "verb", "A1", "I go to work by bus."],
  ["come", "venir", "verb", "A1", "Come and sit next to me."],
  ["get", "conseguir / ponerse", "verb", "A2", "I get tired after work."],
  ["make", "hacer / fabricar", "verb", "A2", "Let's make a plan."],
  ["take", "coger / llevar", "verb", "A2", "Take an umbrella with you."],
  ["give", "dar", "verb", "A1", "Can you give me a hand?"],
  ["know", "saber / conocer", "verb", "A1", "I know the answer."],
  ["want", "querer", "verb", "A1", "I want to improve my English."],
  ["need", "necesitar", "verb", "A1", "We need more time."],
  ["like", "gustar", "verb", "A1", "I like listening to podcasts."],
  ["understand", "entender", "verb", "A2", "I don't understand this question."],
  ["remember", "recordar", "verb", "A2", "Remember to check the address."],
  ["forget", "olvidar", "verb", "A2", "Don't forget your keys."],
  ["choose", "elegir", "verb", "B1", "You can choose any topic."],
  ["improve", "mejorar", "verb", "A2", "Practice helps you improve."],
  ["suggest", "sugerir", "verb", "B1", "Can you suggest a good restaurant?"],
  ["achieve", "lograr", "verb", "B1", "She achieved her goal."],
  ["avoid", "evitar", "verb", "B1", "Try to avoid translating every word."],
  ["manage", "conseguir / gestionar", "verb", "B1", "I managed to finish on time."],
  ["require", "requerir", "verb", "B2", "This job requires experience."],
  ["provide", "proporcionar", "verb", "B2", "The course provides useful practice."],
  ["include", "incluir", "verb", "B1", "The price includes breakfast."],
  ["develop", "desarrollar", "verb", "B1", "Develop a regular study habit."],
  ["support", "apoyar", "verb", "B1", "My colleagues support the idea."],
  ["accept", "aceptar", "verb", "B1", "They accepted my application."],
  ["refuse", "rechazar", "verb", "B2", "He refused to sign the document."],
  ["mention", "mencionar", "verb", "B2", "She mentioned the problem yesterday."],
  ["recommend", "recomendar", "verb", "B1", "I recommend this book."],
  ["depend", "depender", "verb", "B1", "It depends on the weather."],
  ["involve", "implicar", "verb", "B2", "The role involves working with clients."],
  ["solve", "resolver", "verb", "B1", "Let's solve this together."],
  ["reliable", "fiable", "adjective", "A2", "We need a reliable internet connection."],
  ["confident", "seguro de sí mismo", "adjective", "B1", "I feel more confident speaking now."],
  ["patient", "paciente", "adjective", "A2", "Be patient with yourself."],
  ["effective", "eficaz", "adjective", "B1", "This is an effective way to revise."],
  ["challenging", "exigente / difícil", "adjective", "B1", "The listening task was challenging."],
  ["outstanding", "excelente", "adjective", "C1", "She did an outstanding job."],
  ["always", "siempre", "adverb", "A1", "I always review my notes."],
  ["usually", "normalmente", "adverb", "A1", "I usually study in the evening."],
  ["already", "ya", "adverb", "A2", "I've already finished the exercise."],
  ["carefully", "con cuidado", "adverb", "B1", "Read the instructions carefully."],
  ["however", "sin embargo", "adverb", "B1", "However, we decided to continue."],
  ["although", "aunque", "conjunction", "B1", "Although it was late, we continued."],
  ["despite", "a pesar de", "preposition", "B2", "Despite the rain, we went out."],
  ["look after", "cuidar de", "phrasal verb", "A2", "Can you look after my dog?"],
  ["find out", "averiguar", "phrasal verb", "A2", "I need to find out the answer."],
  ["carry on", "continuar", "phrasal verb", "B1", "Please carry on with your work."],
  ["work out", "resolver / hacer ejercicio", "phrasal verb", "B1", "We will work out a solution."],
  ["bring up", "mencionar / sacar un tema", "phrasal verb", "B2", "She brought up an important point."],
  ["rule out", "descartar", "phrasal verb", "C1", "We cannot rule out that possibility."]
  ,["make a decision", "tomar una decisión", "collocation", "B1", "We need to make a decision today."]
  ,["take a break", "tomarse un descanso", "collocation", "A2", "Let's take a short break."]
  ,["have a look", "echar un vistazo", "collocation", "A2", "Can I have a look at the menu?"]
  ,["pay attention", "prestar atención", "collocation", "B1", "Please pay attention to the instructions."]
  ,["make progress", "progresar", "collocation", "B1", "You are making progress every week."]
  ,["keep in touch", "mantener el contacto", "collocation", "B1", "Let's keep in touch after the course."]
  ,["get ready", "prepararse", "phrasal verb", "A2", "I need to get ready for work."]
  ,["deal with", "ocuparse de / afrontar", "phrasal verb", "B1", "I deal with customers every day."]
  ,["look forward to", "tener ganas de", "phrasal verb", "B1", "I look forward to hearing from you."]
  ,["run out of", "quedarse sin", "phrasal verb", "B1", "We have run out of coffee."]
  ,["set up", "configurar / montar", "phrasal verb", "B1", "Can you help me set up my account?"]
  ,["turn down", "rechazar / bajar el volumen", "phrasal verb", "B2", "She turned down the offer."]
].map(([word, meaning, type, level, example]) => ({ word, meaning, type, level, example, editorial: true }));
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
const expansionLexicon = [
  ["appointment","cita","noun","A1","I have a doctor's appointment on Friday.","health","Citas"],
  ["medicine","medicina","noun","A1","Take your medicine after breakfast.","health","Médico y farmacia"],
  ["fever","fiebre","noun","A2","She has a high fever.","health","Síntomas"],
  ["cough","tos","noun","A2","My cough is getting better.","health","Síntomas"],
  ["bandage","venda","noun","A2","Put a bandage on the cut.","health","Médico y farmacia"],
  ["healthy","saludable","adjective","A1","I try to eat healthy food.","health","Hábitos saludables"],
  ["treatment","tratamiento","noun","B1","The treatment lasted three weeks.","health","Médico y farmacia"],
  ["recover","recuperarse","verb","B1","It took her a month to recover.","health","Hábitos saludables"],
  ["ingredient","ingrediente","noun","A2","Check the ingredients for nuts.","food","Recetas y cocina"],
  ["onion","cebolla","noun","A1","Chop the onion finely.","food","Frutas y verduras"],
  ["garlic","ajo","noun","A1","Add two cloves of garlic.","food","Recetas y cocina"],
  ["flour","harina","noun","A2","Mix the flour with the eggs.","food","Recetas y cocina"],
  ["spicy","picante","adjective","A2","This sauce is too spicy for me.","food","Sabores"],
  ["sweet","dulce","adjective","A1","Would you like something sweet?","food","Sabores"],
  ["bitter","amargo","adjective","B1","The coffee tastes bitter.","food","Sabores"],
  ["bake","hornear","verb","A2","Bake the cake for thirty minutes.","food","Recetas y cocina"],
  ["fry","freír","verb","A2","Fry the onions in olive oil.","food","Recetas y cocina"],
  ["portion","ración","noun","B1","The portions are very generous.","food","Platos y comidas"],
  ["ceiling","techo","noun","A2","There is a lamp on the ceiling.","home","Habitaciones"],
  ["stairs","escaleras","noun","A1","The bathroom is upstairs.","home","Habitaciones"],
  ["carpet","alfombra","noun","A2","The carpet needs cleaning.","home","Muebles y objetos"],
  ["screwdriver","destornillador","noun","B1","I need a screwdriver to fix it.","home","Problemas y reparaciones"],
  ["neighbourhood","barrio","noun","A2","This is a quiet neighbourhood.","home","Casa y entorno"],
  ["dust","polvo","noun","A2","There is dust on the shelf.","home","Tareas domésticas"],
  ["repair","reparar","verb","B1","The plumber repaired the leak.","home","Problemas y reparaciones"],
  ["manager","responsable","noun","A1","My manager is very supportive.","work","Oficina"],
  ["department","departamento","noun","A2","She works in the sales department.","work","Oficina"],
  ["agenda","orden del día","noun","B1","I sent the meeting agenda.","work","Reuniones"],
  ["minutes","acta de reunión","noun","B1","Could you share the minutes?","work","Reuniones"],
  ["target","objetivo","noun","B1","We need to reach our sales target.","work","Proyectos"],
  ["negotiate","negociar","verb","B2","They negotiated a better contract.","work","Reuniones"],
  ["promote","ascender","verb","B1","She was promoted last year.","work","Entrevistas y carrera"],
  ["workload","carga de trabajo","noun","B2","My workload is heavy this week.","work","Proyectos"],
  ["application","solicitud","noun","B1","I submitted my job application.","work","Entrevistas y carrera"],
  ["platform","plataforma","noun","A1","The train leaves from platform three.","travel","Transporte y direcciones"],
  ["delay","retraso","noun","A2","Our flight has a two-hour delay.","travel","Aeropuerto"],
  ["departure","salida","noun","B1","The departure time has changed.","travel","Aeropuerto"],
  ["destination","destino","noun","A2","What is your final destination?","travel","Transporte y direcciones"],
  ["abroad","en el extranjero","adverb","B1","She has lived abroad for years.","travel","Preparar un viaje"],
  ["suitcase","maleta","noun","A1","My suitcase is very heavy.","travel","Aeropuerto"],
  ["refund","reembolso","noun","B1","I would like to request a refund.","shopping","Comprar y pagar"],
  ["receipt","recibo","noun","A1","Keep your receipt, please.","shopping","Comprar y pagar"],
  ["discount","descuento","noun","A2","Is there a student discount?","shopping","Calidad y opiniones"],
  ["fitting room","probador","noun","A2","Where are the fitting rooms?","shopping","Ropa"],
  ["refund","reembolso","noun","B1","The refund will arrive in five days.","shopping","Comprar y pagar"],
  ["durable","resistente","adjective","B1","These bags are durable and practical.","shopping","Calidad y opiniones"],
  ["device","dispositivo","noun","A2","This device connects to Wi-Fi.","technology","Dispositivos"],
  ["screen","pantalla","noun","A1","The screen is cracked.","technology","Dispositivos"],
  ["keyboard","teclado","noun","A1","My keyboard is not working.","technology","Dispositivos"],
  ["privacy","privacidad","noun","B2","Check your privacy settings.","technology","Internet y cuentas"],
  ["browse","navegar","verb","B1","I browse the internet on my phone.","technology","Internet y cuentas"],
  ["backup","copia de seguridad","noun","B1","Make a backup of your photos.","technology","Problemas técnicos"],
  ["update","actualizar","verb","A2","Please update the app.","technology","Problemas técnicos"],
  ["cloud","nube","noun","B1","The files are stored in the cloud.","technology","Trabajo digital"],
  ["forecast","previsión","noun","A2","The forecast says it will rain.","nature","Tiempo"],
  ["thunderstorm","tormenta","noun","B1","A thunderstorm is coming.","nature","Tiempo"],
  ["temperature","temperatura","noun","A1","The temperature is below zero.","nature","Tiempo"],
  ["environment","medio ambiente","noun","B1","We should protect the environment.","nature","Paisajes"],
  ["recycle","reciclar","verb","A2","We recycle glass and paper.","nature","Aire libre"],
  ["wildlife","fauna","noun","B1","The park is home to diverse wildlife.","nature","Animales y plantas"],
  ["assignment","tarea","noun","A2","I submitted my assignment yesterday.","education","Clase"],
  ["lecture","clase magistral","noun","B1","The lecture starts at ten.","education","Clase"],
  ["research","investigación","noun","B1","She is doing research for her project.","education","Aprender idiomas"],
  ["scholarship","beca","noun","B2","He applied for a scholarship.","education","Organización"],
  ["revise","repasar","verb","A2","I need to revise for the exam.","education","Exámenes"],
  ["deadline","fecha límite","noun","B1","The deadline is next Monday.","education","Organización"],
  ["budget","presupuesto","noun","A2","We need to plan our budget.","money","Presupuesto"],
  ["income","ingresos","noun","B1","Their income has increased.","money","Presupuesto"],
  ["savings","ahorros","noun","A2","I am trying to build up my savings.","money","Presupuesto"],
  ["charge","cobrar","verb","B1","They charged me twice.","money","Pagos"],
  ["transfer","transferencia","noun","A2","I made a bank transfer.","money","Banco"],
  ["owe","deber","verb","B1","I still owe you twenty euros.","money","Problemas"],
  ["invite","invitar","verb","A1","I would like to invite you to dinner.","social","Invitaciones"],
  ["available","disponible","adjective","A2","Are you available on Saturday?","social","Invitaciones"],
  ["cancel","cancelar","verb","A2","I am sorry, I have to cancel.","social","Planes"],
  ["awkward","incómodo","adjective","B1","There was an awkward silence.","social","Reacciones"],
  ["celebrate","celebrar","verb","A1","Let's celebrate your birthday.","social","Celebraciones"],
  ["acquaintance","conocido","noun","B2","He is an old acquaintance of mine.","social","Relaciones"],
  ["honest","sincero","adjective","A2","Please give me your honest opinion.","people","Personalidad"],
  ["ambitious","ambicioso","adjective","B1","She is ambitious and hard-working.","people","Personalidad"],
  ["disappointed","decepcionado","adjective","B1","I was disappointed by the result.","people","Emociones"],
  ["patient","paciente","adjective","A2","You need to be patient.","people","Personalidad"],
  ["argument","discusión","noun","B1","They had an argument yesterday.","people","Relaciones"],
  ["trust","confiar","verb","B1","I trust my closest friends.","people","Relaciones"]
].map(([word, meaning, type, level, example, topic, section]) => ({ word, meaning, type, level, example, topic, section, editorial: true }));
const topicTitleToId = Object.fromEntries(vocabTopics.map(topic => [topic.title, topic.id]));
const normalizeVocabularyEntry = (item, index, source = "legacy") => {
  const theme = item.theme || topicTitleToId[item.topic] || "general";
  const word = item.word.trim();
  return {
    id: item.id || `${theme}-${word.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
    theme,
    subtopic: item.subtopic || item.section || "General",
    word,
    meaning: item.meaning,
    type: item.type || "word",
    cefr: item.cefr || item.level || "A2",
    level: item.level || item.cefr || "A2",
    frequency: item.frequency || "medium",
    priority: item.priority || 2,
    variant: item.variant || "both",
    variantUk: item.variantUk || "",
    variantUs: item.variantUs || "",
    example: item.example || word,
    exercises: item.exercises || ["translation", "gap", "audio"],
    editorial: item.editorial ?? source !== "legacy"
  };
};
const rawVocabulary = [
  ...(window.BIMBA_VOCABULARY || []),
  ...catalogFromTopics,
  ...grammarLexicon,
  ...curatedLexicon,
  ...expansionLexicon
];
const vocabularyCatalog = rawVocabulary
  .map((item, index) => normalizeVocabularyEntry(item, index, index < (window.BIMBA_VOCABULARY || []).length ? "editorial" : "legacy"))
  .filter((item, index, catalog) => catalog.findIndex(candidate => `${candidate.theme}:${candidate.word.toLowerCase()}:${candidate.type}` === `${item.theme}:${item.word.toLowerCase()}:${item.type}`) === index);
const topicVocabulary = (theme, mode = "useful") => {
  const items = vocabularyCatalog.filter(item => item.theme === theme);
  if (mode !== "unique") return items;
  return items.filter((item, index, all) => all.findIndex(candidate => candidate.word.toLowerCase() === item.word.toLowerCase()) === index);
};
const topicProgress = theme => {
  const progress = state.topicProgress?.[theme] || { learned: 0, reviewed: 0, saved: 0 };
  const total = topicVocabulary(theme, "unique").length;
  return { ...progress, total, percentage: total ? Math.round((progress.learned / total) * 100) : 0 };
};
const markTopicProgress = (word, field) => {
  const item = vocabularyCatalog.find(candidate => candidate.word.toLowerCase() === word.toLowerCase());
  if (!item?.theme || !vocabTopics.some(topic => topic.id === item.theme)) return;
  const current = state.topicProgress?.[item.theme] || { learned: 0, reviewed: 0, saved: 0 };
  state.topicProgress = { ...(state.topicProgress || {}), [item.theme]: { ...current, [field]: (current[field] || 0) + 1, lastStudiedAt: new Date().toISOString() } };
};
const vocabularyPartOfSpeech = [
  ["all", "Todas"], ["noun", "Sustantivos"], ["verb", "Verbos"], ["adjective", "Adjetivos"],
  ["adverb", "Adverbios"], ["preposition", "Preposiciones"], ["phrasal verb", "Phrasal verbs"], ["collocation", "Colocaciones"]
];
const vocabularyLevels = ["all", "A1", "A2", "B1", "B2", "C1"];
const getCatalogWord = word => vocabularyCatalog.find(item => item.word.toLowerCase() === word.toLowerCase());

const escapeHtml = (value = "") => String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[c]));
const toast = (message) => { const el = document.querySelector("#toast"); el.textContent = message; el.classList.add("show"); setTimeout(() => el.classList.remove("show"), 2600); };
const themeNames = { pink: "Rosa", red: "Rojo", blue: "Azul", green: "Verde", purple: "Morado", orange: "Naranja", yellow: "Amarillo" };
const themeColors = { pink: "#f7d9e4", red: "#f4c5c5", blue: "#c9def4", green: "#cce8d8", purple: "#ddcff2", orange: "#f7d5b7", yellow: "#f5e5a9" };
function applyTheme(theme) {
  const selected = themeNames[theme] ? theme : "pink";
  document.documentElement.dataset.theme = selected === "pink" ? "" : selected;
  localStorage.setItem("bimba-theme", selected);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", themeColors[selected]);
  document.querySelector("#theme-button")?.setAttribute("aria-label", `Cambiar color (actual: ${themeNames[selected]})`);
}
const base64ToUint8Array = value => {
  const padding = "=".repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), character => character.charCodeAt(0));
};
async function enableNotifications() {
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return toast("Este dispositivo no admite notificaciones web.");
  if (location.protocol === "file:") return toast("Abre la versión publicada en Safari para activar avisos en iPhone.");
  const permission = await Notification.requestPermission();
  if (permission !== "granted") return toast("No se han activado los avisos.");
  const registration = await navigator.serviceWorker.ready;
  if (!PUSH_PUBLIC_KEY) {
    localStorage.setItem("bimba-notifications", "permission-granted");
    return toast("Permiso concedido. Falta configurar el envío Web Push gratuito.");
  }
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64ToUint8Array(PUSH_PUBLIC_KEY)
  });
  if (!supabaseClient || !currentSession) return toast("Inicia sesión para guardar este dispositivo.");
  const { error } = await supabaseClient.from("push_subscriptions").upsert({
    user_id: currentSession.user.id,
    endpoint: subscription.endpoint,
    subscription: subscription.toJSON()
  }, { onConflict: "user_id,endpoint" });
  if (error) throw error;
  localStorage.setItem("bimba-notifications", "subscribed");
  toast("Avisos activados en este iPhone.");
}
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
const isSavedWord = word => (state.vocabulary || []).some(item => item.word === word);
const saveWordButton = (word, label = "Guardar palabra") => `<button class="pill-button save-word-button${isSavedWord(word) ? " saved" : ""}" data-action="save-word" data-word="${escapeHtml(word)}" aria-pressed="${isSavedWord(word)}">${isSavedWord(word) ? "♥ Guardada" : `♡ ${label}`}</button>`;
const curriculum = [
  { id: "sentence-basics", title: "Construir una frase", topic: "grammar", skill: "grammar", level: "A1", minutes: 12, description: "Sujeto, verbo, objeto, lugar y tiempo.", phrase: "I work from home on Mondays.", tip: "Piensa en bloques: quién + qué hace + dónde + cuándo." },
  { id: "in-on-at", title: "IN, ON y AT sin liarte", topic: "grammar", skill: "grammar", level: "A2", minutes: 20, description: "Tiempo, lugar, transporte y excepciones que realmente necesitas.", phrase: "I work at home on Monday in the morning.", tip: "Piensa en una escala: IN encierra, ON toca una superficie o día, AT señala un punto exacto.", guide: true },
  { id: "some-any-no", title: "Some, any y no: elegir según la frase", topic: "grammar", skill: "grammar", level: "A2", minutes: 20, description: "Afirmaciones, preguntas, negación y ofrecimientos.", phrase: "I have some questions, but I don't have any answers.", tip: "Some suele presentar una cantidad; any aparece en preguntas y negativas; no ya niega el nombre.", guideKey: "some-any-no" },
  { id: "something-anything-nothing", title: "Something, anything y nothing", topic: "grammar", skill: "grammar", level: "A2", minutes: 18, description: "Distinguir cosas indefinidas sin crear dobles negaciones.", phrase: "Is there anything I can do? No, there is nothing to worry about.", tip: "Anything no significa siempre 'algo': depende de si preguntas, niegas o dices 'cualquier cosa'.", guideKey: "indefinite-pronouns" },
  { id: "someone-anyone-no-one", title: "Someone, anyone y no one", topic: "grammar", skill: "grammar", level: "B1", minutes: 18, description: "Hablar de personas no identificadas y evitar errores con nobody.", phrase: "Someone called, but I don't know who it was.", tip: "No one ya es negativo: no digas I didn't see no one en inglés estándar.", guideKey: "indefinite-pronouns" },
  { id: "somewhere-anywhere-nowhere", title: "Somewhere, anywhere y nowhere", topic: "grammar", skill: "grammar", level: "B1", minutes: 16, description: "Lugares indefinidos en afirmaciones, preguntas y negativas.", phrase: "We can meet somewhere quiet, but not anywhere too far away.", tip: "La misma lógica some/any/no se aplica a lugares.", guideKey: "indefinite-pronouns" },
  { id: "much-many-few-little", title: "Much, many, few y little", topic: "grammar", skill: "grammar", level: "A2", minutes: 20, description: "Cantidad con nombres contables e incontables.", phrase: "There aren't many chairs, but there is a little space.", tip: "Many/few cuentan unidades; much/little hablan de una cantidad no contable.", guideKey: "quantifiers" },
  { id: "each-every-all", title: "Each, every y all", topic: "grammar", skill: "grammar", level: "B1", minutes: 18, description: "Distribuir, generalizar y hablar de grupos.", phrase: "Every student has a different goal, and they all need practice.", tip: "Each mira a los miembros uno por uno; every generaliza el conjunto; all incluye el conjunto completo.", guideKey: "quantifiers" },
  { id: "either-neither-both", title: "Either, neither y both", topic: "grammar", skill: "grammar", level: "B1", minutes: 18, description: "Elegir entre dos opciones y hablar de ambas.", phrase: "Both options are possible; either one is fine.", tip: "Both = los dos; either = uno de los dos; neither = ninguno de los dos.", guideKey: "quantifiers" },
  { id: "another-other", title: "Another, other, the other y others", topic: "grammar", skill: "B1", minutes: 18, description: "No confundir otro, otros y el otro.", phrase: "Could I have another coffee? The other one was cold.", tip: "Another va con singular; other puede acompañar plural; the other señala el restante.", guideKey: "quantifiers" },
  { id: "personal-pronouns", title: "Pronombres personales: sujeto y objeto", topic: "grammar", skill: "grammar", level: "A1", minutes: 18, description: "I/me, he/him, she/her y el resto en frases reales.", phrase: "She called me, but I couldn't hear her.", tip: "El sujeto hace la acción; el objeto la recibe: I saw him, no I saw he.", guideKey: "pronouns" },
  { id: "possessive-pronouns", title: "My, mine, your y yours", topic: "grammar", skill: "grammar", level: "A2", minutes: 18, description: "Adjetivos y pronombres posesivos sin confundirlos.", phrase: "This is my seat, and that one is yours.", tip: "My va delante de un nombre; mine puede ir solo: This is mine.", guideKey: "pronouns" },
  { id: "reflexive-pronouns", title: "Myself, yourself y los reflexivos", topic: "grammar", skill: "grammar", level: "A2", minutes: 16, description: "Acciones sobre uno mismo y énfasis.", phrase: "I taught myself to cook.", tip: "Usa -self/-selves cuando quien hace y recibe la acción es la misma persona.", guideKey: "pronouns" },
  { id: "demonstrative-pronouns", title: "This, that, these y those", topic: "grammar", skill: "grammar", level: "A1", minutes: 15, description: "Señalar cosas según distancia y número.", phrase: "These shoes are mine, but those are yours.", tip: "This/these están cerca; that/those están más lejos. This/that singular, these/those plural.", guideKey: "pronouns" },
  { id: "relative-pronouns", title: "Who, which, that y whose", topic: "grammar", skill: "grammar", level: "B1", minutes: 20, description: "Unir ideas y describir personas y cosas.", phrase: "The colleague who helped me is from Madrid.", tip: "Who suele referirse a personas; which a cosas; whose expresa posesión.", guideKey: "pronouns" },
  { id: "interrogative-pronouns", title: "Who, what, which y whose en preguntas", topic: "grammar", skill: "grammar", level: "A2", minutes: 18, description: "Elegir el pronombre correcto al preguntar.", phrase: "Which one is yours, and whose is this?", tip: "Which suele elegir entre opciones; what pregunta de forma abierta; whose pregunta por el dueño.", guideKey: "pronouns" },
  { id: "adjectives", title: "Adjetivos en frases", topic: "grammar", skill: "grammar", level: "A2", minutes: 15, description: "Describir personas, cosas y emociones.", phrase: "She is a reliable colleague.", tip: "Con estados usamos be + adjetivo; delante de un nombre: a + adjetivo + noun." },
  { id: "adverbs", title: "Adverbios: uso y posición", topic: "grammar", skill: "grammar", level: "A2", minutes: 20, description: "Frecuencia, tiempo, modo, lugar, grado y conectores.", phrase: "I usually work from home.", tip: "La posición depende del tipo: frecuencia antes del verbo normal, modo después del objeto y lugar normalmente al final.", guideKey: "adverbs" },
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
  ,{ id: "to-be-and-pronouns", title: "To be y pronombres", topic: "grammar", skill: "grammar", level: "A1", minutes: 12, description: "Presentarte, decir quién eres y describir estados.", phrase: "I am from Spain and she is my colleague.", tip: "I am, you are, he/she/it is, we/they are." }
  ,{ id: "there-is-are", title: "There is y there are", topic: "grammar", skill: "grammar", level: "A1", minutes: 12, description: "Describir lo que hay en un lugar.", phrase: "There are two cafés near my office.", tip: "There is para singular y there are para plural." }
  ,{ id: "questions-can", title: "Preguntas y can", topic: "grammar", skill: "grammar", level: "A1", minutes: 15, description: "Pedir información, permiso y ayuda.", phrase: "Can you help me, please?", tip: "Do/does pregunta por hábitos; can pregunta por capacidad o permiso." }
  ,{ id: "countable-uncountable", title: "Contables e incontables", topic: "grammar", skill: "grammar", level: "A2", minutes: 18, description: "Hablar de cantidades y compras.", phrase: "How much water and how many bottles do we need?", tip: "How many con contables; how much con incontables." }
  ,{ id: "comparatives", title: "Comparar personas y cosas", topic: "grammar", skill: "grammar", level: "A2", minutes: 15, description: "Comparativos, superlativos y opiniones.", phrase: "This route is cheaper than the other one.", tip: "Adjetivo corto + -er; more + adjetivo largo." }
  ,{ id: "present-perfect", title: "Present perfect para experiencias", topic: "grammar", skill: "grammar", level: "B1", minutes: 20, description: "Hablar de experiencias y acciones recientes.", phrase: "Have you ever worked abroad?", tip: "Have/has + participio; usa ever y never para experiencias." }
  ,{ id: "future-plans", title: "Planes con will y going to", topic: "grammar", skill: "grammar", level: "A2", minutes: 18, description: "Decisiones, predicciones y planes.", phrase: "I am going to visit my family next weekend.", tip: "Going to para planes; will para decisiones espontáneas y predicciones." }
  ,{ id: "passive-voice", title: "Voz pasiva útil", topic: "grammar", skill: "grammar", level: "B1", minutes: 20, description: "Describir procesos y noticias.", phrase: "The report was sent this morning.", tip: "Be + participio cuando importa la acción, no quién la hace." }
  ,{ id: "reported-speech", title: "Contar lo que alguien dijo", topic: "grammar", skill: "grammar", level: "B2", minutes: 22, description: "Transmitir información y conversaciones.", phrase: "She said that she would call me later.", tip: "Ajusta tiempos y pronombres al contar palabras de otra persona." }
  ,{ id: "relative-clauses", title: "Frases relativas", topic: "grammar", skill: "grammar", level: "B2", minutes: 20, description: "Añadir información sin crear frases cortas.", phrase: "The colleague who helped me works in Madrid.", tip: "Who para personas, which para cosas y that en muchos contextos." }
  ,{ id: "mixed-conditionals", title: "Condicionales avanzados", topic: "grammar", skill: "grammar", level: "C1", minutes: 25, description: "Relacionar situaciones pasadas y consecuencias actuales.", phrase: "If I had studied earlier, I would feel more confident now.", tip: "Combina tiempos cuando la condición y el resultado están en momentos distintos." }
  ,{ id: "restaurant-order", title: "Pedir en un restaurante", topic: "daily", skill: "speaking", level: "A1", minutes: 12, description: "Pedir comida, preguntar ingredientes y pagar.", phrase: "Could I have the bill, please?", tip: "Could I have... es una petición educada y muy reutilizable." }
  ,{ id: "shopping-return", title: "Devolver una compra", topic: "daily", skill: "speaking", level: "A2", minutes: 15, description: "Explicar un problema y pedir un cambio o reembolso.", phrase: "I would like to return this because it is damaged.", tip: "I would like to... suena más amable que I want." }
  ,{ id: "phone-call", title: "Hablar por teléfono", topic: "conversation", skill: "listening", level: "B1", minutes: 18, description: "Identificarte, pedir que repitan y dejar un mensaje.", phrase: "Could you put me through to the accounts department?", tip: "Usa Could you repeat that? cuando no entiendas una llamada." }
  ,{ id: "problem-solving", title: "Resolver un problema", topic: "work", skill: "speaking", level: "B1", minutes: 18, description: "Explicar qué ocurre y proponer soluciones.", phrase: "There seems to be an issue with the delivery.", tip: "There seems to be suaviza una queja o problema." }
  ,{ id: "opinion-debate", title: "Dar opiniones con educación", topic: "conversation", skill: "speaking", level: "B2", minutes: 22, description: "Estar de acuerdo, discrepar y justificar.", phrase: "I see your point, but I look at it differently.", tip: "Concede primero y después introduce tu matiz." }
  ,{ id: "email-complaint", title: "Escribir una reclamación", topic: "work", skill: "writing", level: "B1", minutes: 20, description: "Explicar un problema, pedir una solución y cerrar.", phrase: "I am writing to complain about the service I received.", tip: "Sé específico, educado y termina con una petición clara." }
  ,{ id: "photo-description", title: "Describir una imagen", topic: "conversation", skill: "writing", level: "A2", minutes: 15, description: "Describir personas, lugares y acciones.", phrase: "In the foreground, there is a woman who is smiling.", tip: "Usa there is/are y present continuous para lo que está ocurriendo." }
  ,{ id: "food-listening", title: "Listening: pedir comida", topic: "daily", skill: "listening", level: "A2", minutes: 15, description: "Escuchar una conversación breve en un restaurante.", phrase: "Are you ready to order?", tip: "Escucha primero la intención general y después los detalles." }
  ,{ id: "connected-speech", title: "Pronunciación: palabras enlazadas", topic: "pronunciation", skill: "pronunciation", level: "B1", minutes: 15, description: "Reconocer cómo se unen las palabras al hablar.", phrase: "What are you going to do?", tip: "En el inglés natural las palabras se conectan; practica por grupos de sentido." }
  ,{ id: "th-sounds", title: "Pronunciación: el sonido th", topic: "pronunciation", skill: "pronunciation", level: "B1", minutes: 15, description: "Distinguir el sonido de think y this.", phrase: "I think this is the right thing.", tip: "Coloca suavemente la lengua entre los dientes y deja salir el aire." }
];
curriculum.push(
  { id: "a1-personal-info", title: "Presentarte con confianza", topic: "conversation", skill: "speaking", level: "A1", minutes: 12, description: "Nombre, ciudad, trabajo y gustos.", phrase: "I live in Madrid and I work in a small shop.", tip: "Une dos frases con and para dar más información." },
  { id: "a1-daily-time", title: "La hora y los momentos del día", topic: "daily", skill: "vocabulary", level: "A1", minutes: 12, description: "Hablar de horarios y rutinas.", phrase: "I have lunch at one o'clock.", tip: "Usa at con horas y in the morning/afternoon/evening." },
  { id: "a1-family", title: "Hablar de tu familia", topic: "conversation", skill: "vocabulary", level: "A1", minutes: 12, description: "Relaciones, posesivos y descripción básica.", phrase: "My sister lives near my parents.", tip: "My, your, his y her indican posesión." },
  { id: "a1-shopping", title: "Comprar algo sencillo", topic: "daily", skill: "speaking", level: "A1", minutes: 12, description: "Precios, tallas y peticiones básicas.", phrase: "How much is this blue shirt?", tip: "How much is...? pregunta por el precio de algo singular." },
  { id: "a1-home", title: "Describir tu casa", topic: "daily", skill: "speaking", level: "A1", minutes: 12, description: "Habitaciones, muebles y there is/are.", phrase: "There is a sofa next to the window.", tip: "There is para uno; there are para varios." },
  { id: "a2-past-weekend", title: "Contar tu fin de semana", topic: "conversation", skill: "speaking", level: "A2", minutes: 15, description: "Pasado simple con marcadores de tiempo.", phrase: "I went to the market and bought some fruit.", tip: "Usa yesterday, last weekend y ago para situar el pasado." },
  { id: "a2-comparisons", title: "Comparar opciones", topic: "conversation", skill: "speaking", level: "A2", minutes: 15, description: "Elegir entre dos opciones y justificar.", phrase: "The train is faster but the bus is cheaper.", tip: "Une la comparación con but para expresar contraste." },
  { id: "a2-health-appointment", title: "Pedir cita médica", topic: "health", skill: "speaking", level: "A2", minutes: 15, description: "Síntomas, fechas y peticiones en una consulta.", phrase: "I would like to make an appointment for next week.", tip: "I would like to... es una petición educada." },
  { id: "a2-travel-directions", title: "Pedir y dar indicaciones", topic: "travel", skill: "speaking", level: "A2", minutes: 15, description: "Direcciones, transporte y puntos de referencia.", phrase: "Go straight on and turn left at the bank.", tip: "Practica los verbos de movimiento con un mapa mental." },
  { id: "a2-listening-routine", title: "Listening: una rutina real", topic: "daily", skill: "listening", level: "A2", minutes: 15, description: "Identificar horas, acciones y frecuencia.", phrase: "I usually leave home at half past eight.", tip: "Busca primero las palabras de tiempo." },
  { id: "a2-writing-message", title: "Escribir un mensaje informal", topic: "conversation", skill: "writing", level: "A2", minutes: 15, description: "Invitar, confirmar y cambiar un plan.", phrase: "Are you still free for coffee tomorrow?", tip: "Empieza con el motivo y termina con una pregunta clara." },
  { id: "b1-storytelling", title: "Contar una historia", topic: "conversation", skill: "speaking", level: "B1", minutes: 20, description: "Ordenar acontecimientos con conectores.", phrase: "At first I was nervous, but eventually everything went well.", tip: "Usa first, then, suddenly, eventually y in the end." },
  { id: "b1-opinions", title: "Explicar una opinión", topic: "conversation", skill: "speaking", level: "B1", minutes: 20, description: "Justificar ideas con razones y ejemplos.", phrase: "In my opinion, public transport should be cheaper.", tip: "Añade because y for example para desarrollar la idea." },
  { id: "b1-work-meeting", title: "Participar en una reunión", topic: "work", skill: "speaking", level: "B1", minutes: 20, description: "Interrumpir con educación, proponer y resumir.", phrase: "Could I add something to that point?", tip: "Could I...? permite intervenir sin sonar brusco." },
  { id: "b1-listening-news", title: "Listening: entender la idea principal", topic: "media", skill: "listening", level: "B1", minutes: 20, description: "Distinguir idea principal, detalles y opinión.", phrase: "The report focuses on changes in the local area.", tip: "No intentes traducir cada frase; identifica tema, postura y datos." },
  { id: "b1-email-request", title: "Pedir algo por email", topic: "work", skill: "writing", level: "B1", minutes: 18, description: "Escribir una petición clara y educada.", phrase: "Could you let me know whether this is possible?", tip: "Explica el contexto antes de formular la petición." },
  { id: "b1-pronunciation-ed", title: "Pronunciación: terminaciones -ed", topic: "pronunciation", skill: "pronunciation", level: "B1", minutes: 15, description: "Distinguir /t/, /d/ e /ɪd/ en verbos regulares.", phrase: "I watched, played and needed more time.", tip: "La terminación cambia según el último sonido del verbo." },
  { id: "b2-negotiation", title: "Negociar una solución", topic: "work", skill: "speaking", level: "B2", minutes: 22, description: "Proponer, ceder y defender condiciones.", phrase: "Would you be willing to meet us halfway?", tip: "Las fórmulas indirectas ayudan a negociar con tacto." },
  { id: "b2-formal-email", title: "Email formal y registro", topic: "work", skill: "writing", level: "B2", minutes: 22, description: "Distinguir tono cercano, neutro y formal.", phrase: "I would appreciate it if you could respond by Friday.", tip: "Evita contracciones y elige verbos precisos en registros formales." },
  { id: "b2-listening-fast", title: "Listening: habla rápida", topic: "media", skill: "listening", level: "B2", minutes: 22, description: "Reconocer palabras enlazadas y omisiones.", phrase: "What do you reckon we should do about it?", tip: "Entrena grupos de sentido, no palabras aisladas." },
  { id: "b2-collocations", title: "Colocaciones para sonar natural", topic: "conversation", skill: "vocabulary", level: "B2", minutes: 20, description: "Elegir el verbo que combina naturalmente.", phrase: "We need to reach an agreement.", tip: "Aprende reach an agreement, no make an agreement." },
  { id: "b2-passive-process", title: "Describir un proceso", topic: "work", skill: "writing", level: "B2", minutes: 20, description: "Explicar instrucciones y procesos con voz pasiva.", phrase: "The data is reviewed before the report is published.", tip: "La pasiva centra la atención en el proceso." },
  { id: "c1-persuasive", title: "Argumentar y persuadir", topic: "conversation", skill: "speaking", level: "C1", minutes: 25, description: "Construir una postura con matices y evidencia.", phrase: "While this approach has advantages, its long-term impact is uncertain.", tip: "Concede una objeción antes de presentar tu argumento principal." },
  { id: "c1-academic-writing", title: "Escritura precisa y cohesionada", topic: "work", skill: "writing", level: "C1", minutes: 25, description: "Organizar párrafos, evidencias y conclusiones.", phrase: "This evidence suggests that further research is needed.", tip: "Usa verbos prudentes: suggests, appears, may indicate." },
  { id: "c1-implicit-listening", title: "Listening: ironía y actitud", topic: "media", skill: "listening", level: "C1", minutes: 25, description: "Inferir intención más allá de las palabras.", phrase: "Well, that went exactly as planned, didn't it?", tip: "El tono puede contradecir el significado literal." },
  { id: "c1-register", title: "Cambiar de registro", topic: "conversation", skill: "vocabulary", level: "C1", minutes: 22, description: "Expresar la misma idea de forma informal o formal.", phrase: "I am afraid this proposal is not feasible at present.", tip: "Elige vocabulario según la relación y la situación." }
);
const todayKey = () => new Date().toISOString().slice(0, 10);
const ensurePlan = () => {
  if (!state.user) return;
  const minutes = Number(state.user.dailyMinutes || 15);
  const level = state.user.level?.startsWith("A1") ? "A1" : state.user.level?.startsWith("A2") ? "A2" : state.user.level?.startsWith("B1") ? "B1" : state.user.level?.startsWith("B2") ? "B2" : "C1";
  const goals = state.user.goals || [];
  const preferred = goals.includes("Trabajo") ? ["work", "grammar"] : goals.includes("Viajar") ? ["travel", "daily"] : ["conversation", "grammar"];
  const done = new Set(state.completed || []);
  const weakSkills = Object.entries(state.skills || {}).sort(([, a], [, b]) => a - b).map(([skill]) => skill);
  const previousPending = (state.plan?.lessons || []).filter(id => !done.has(id));
  const dueReview = reviewDue().length;
  const ranked = curriculum.filter(l => !done.has(l.id)).sort((a, b) => {
    const pendingA = previousPending.includes(a.id) ? 0 : 1;
    const pendingB = previousPending.includes(b.id) ? 0 : 1;
    const levelA = a.level === level ? 0 : Math.abs(a.level.charCodeAt(0) - level.charCodeAt(0));
    const levelB = b.level === level ? 0 : Math.abs(b.level.charCodeAt(0) - level.charCodeAt(0));
    const skillA = weakSkills.indexOf(a.skill);
    const skillB = weakSkills.indexOf(b.skill);
    const goalA = preferred.includes(a.topic) ? 0 : 1;
    const goalB = preferred.includes(b.topic) ? 0 : 1;
    const grammarBoostA = a.id === "in-on-at" && (state.errors || []).some(error => /prepos|in-on-at/i.test(error)) ? -1 : 0;
    const grammarBoostB = b.id === "in-on-at" && (state.errors || []).some(error => /prepos|in-on-at/i.test(error)) ? -1 : 0;
    return pendingA - pendingB || grammarBoostA - grammarBoostB || levelA - levelB || skillA - skillB || goalA - goalB || Math.abs(a.minutes - minutes) - Math.abs(b.minutes - minutes);
  });
  const slots = minutes >= 45 ? 3 : minutes >= 25 ? 2 : 1;
  const selected = [];
  for (const lesson of ranked) {
    if (!selected.some(item => item.skill === lesson.skill) || selected.length < slots) selected.push(lesson);
    if (selected.length === slots) break;
  }
  state.plan = { date: todayKey(), minutes, lessons: selected.map(l => l.id), level, weakSkills: weakSkills.slice(0, 3), dueReview };
};
const currentPlanLessons = () => {
  ensurePlan();
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
  content.innerHTML = `<div class="hero"><div class="hero-copy"><div class="eyebrow">Tu plan de hoy · ${state.user?.dailyMinutes || 15} min</div><h1>Hola, ${name}.<br>Hoy puedes dar un pasito más.</h1><p class="muted">Una ruta adaptada a tu nivel, tu objetivo y lo que más necesitas practicar.</p><button class="btn" data-action="lesson">Empezar mi lección <span>→</span></button></div><div class="hero-art" aria-label="Oso panda">🐼</div></div>
  ${pending ? `<div class="section-head"><h2>Tu ruta de hoy</h2><span class="tag">${state.user?.dailyMinutes || 15} min · ${planLessons.length} ${planLessons.length === 1 ? "lección" : "lecciones"}</span></div><div class="card daily-plan"><div><span class="eyebrow">Siguiente recomendación · ${pending.level}</span><h2>${pending.title}</h2><p class="muted">${pending.description}</p><div class="tag">${pending.minutes} min · ${pending.skill}</div></div><button class="btn" data-lesson="${pending.id}">Empezar ahora →</button></div>` : `<div class="notice">Has completado tu ruta de hoy. Mañana tendrás nuevas lecciones.</div>`}
  <div class="section-head"><h2>Organiza tu aprendizaje</h2></div><div class="card"><p class="muted">Haz el diagnóstico para ajustar tu nivel o activa un recordatorio para no perder tu hábito.</p><button class="btn secondary" data-action="start-diagnostic">Repetir diagnóstico</button><button class="btn secondary" data-action="notification" style="margin-left:8px">Activar recordatorios</button></div>
  ${reviewDue().length ? `<div class="section-head"><h2>Repasos pendientes</h2></div><div class="card"><p>Tu memoria tiene ${reviewDue().length} elemento${reviewDue().length === 1 ? "" : "s"} listo${reviewDue().length === 1 ? "" : "s"} para repasar.</p><button class="btn secondary" data-view="vocabulary">Repasar ahora →</button></div>` : ""}
  <div class="section-head"><h2>Tu progreso</h2><button class="btn secondary" data-view="progress">Ver detalles</button></div>
  <div class="stats"><div class="stat"><span>Racha actual</span><strong>${state.streak} 🔥</strong><span>¡Sigue así!</span></div><div class="stat"><span>Palabras activas</span><strong>${state.words}</strong><span>+4 esta semana</span></div><div class="stat"><span>Objetivo mensual</span><strong>${state.goalProgress}%</strong><div class="progress-bar"><i style="width:${state.goalProgress}%"></i></div></div></div>
  <div class="section-head"><h2>Tu menú de aprendizaje</h2></div><div class="cards">
  <div class="lesson-card"><div class="lesson-icon">🎧</div><h3>Escucha y entiende</h3><p class="muted">Un diálogo de la vida real con audio lento y natural.</p><button class="btn secondary" data-action="listen">Practicar escucha</button></div>
  <div class="lesson-card"><div class="lesson-icon">🧩</div><h3>Gramática paso a paso</h3><p class="muted">Entiende las reglas, compara ejemplos y practícalas en frases.</p><button class="btn secondary" data-view="grammar">Estudiar gramática</button></div>
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
const grammarGuides = {
  "some-any-no": {
    title: "La lógica de some, any y no",
    rows: [
      ["SOME", "Afirmaciones y ofrecimientos/peticiones cuando esperas que sí", "I bought some bread. · Would you like some tea?"],
      ["ANY", "Preguntas y negativas; también 'cualquiera' en frases abiertas", "Do you have any questions? · I don't have any money. · Choose any seat."],
      ["NO", "Negación directa delante del nombre", "There is no sugar. = There isn't any sugar."]
    ],
    note: "No mezcles dos negaciones: I don't have any time o I have no time, no I don't have no time."
  },
  "indefinite-pronouns": {
    title: "La familia some-, any- y no-",
    rows: [
      ["SOME-", "Algo/alguien/en algún sitio, normalmente en afirmaciones", "Someone left something somewhere."],
      ["ANY-", "Algo/alguien/en algún sitio en preguntas y negativas; 'cualquiera' en afirmativas", "Did anyone see anything? · You can sit anywhere."],
      ["NO-", "Nada/nadie/en ningún sitio; ya es negativo", "Nobody said anything. · There is nowhere to park."]
    ],
    note: "Después de something/anything/nothing usamos adjetivo: something interesting. No digas I didn't see nobody: usa I didn't see anybody o I saw nobody."
  },
  "quantifiers": {
    title: "Cantidades y opciones sin confundirte",
    rows: [
      ["COUNT", "many/few, each/every y another se usan con unidades contables", "many books · a few ideas · each student · another day"],
      ["MASS", "much/little se usan con incontables; en afirmativas son más naturales a lot of", "much time · a little water · a lot of advice"],
      ["TWO", "both = los dos; either = uno de los dos; neither = ninguno", "Both are good. · Either is fine. · Neither works."]
    ],
    note: "Few/little sin artículo sugieren 'poco y no suficiente'; a few/a little significan 'algo, suficiente para algo'."
  },
  "pronouns": {
    title: "Todos los pronombres por función",
    rows: [
      ["SUBJECT", "Hace la acción: I, you, he, she, it, we, they", "She called me. · They work here.", "Normalmente antes del verbo: sujeto + verbo + resto."],
      ["OBJECT", "Recibe la acción o va después de una preposición: me, him, her, us, them", "I saw him. · Come with me.", "Después del verbo o de una preposición: verb + object / preposition + object."],
      ["POSSESSIVE", "my/your/his delante de nombre; mine/yours/his sin nombre", "This is my bag. · The bag is mine.", "my/your + nombre; mine/yours va solo, normalmente al final o tras be."],
      ["REFLEXIVE", "myself, yourself, himself... cuando acción y receptor coinciden", "I taught myself. · She hurt herself.", "Después del verbo o de la preposición; también al final para dar énfasis: I did it myself."],
      ["DEMONSTRATIVE", "this/these cerca; that/those lejos; singular/plural", "This is easy. · Those are expensive.", "Delante del nombre o solos como sujeto/objeto: These shoes / I prefer those."],
      ["RELATIVE / QUESTION", "who/persona, which/cosa u opción, whose/posesión, what/qué", "The person who called · Which is yours?", "En preguntas suelen ir al principio; en relativas van justo después del nombre que describen."]
    ],
    note: "No elijas por traducción: primero pregunta qué función cumple el pronombre. ¿Hace la acción, la recibe, indica posesión, señala, une ideas o formula una pregunta?"
  },
  "adverbs": {
    title: "Adverbios: cuándo usarlos y dónde colocarlos",
    rows: [
      ["FREQUENCY", "always, usually, often, sometimes, rarely, never indican con qué frecuencia ocurre algo.", "I usually work from home. · She never drives.", "Antes del verbo normal; después de be. Con auxiliares, después del primer auxiliar: I have often seen it."],
      ["TIME", "already, just, still, yet, soon, recently sitúan la acción en el tiempo.", "I've already eaten. · Are you still working? · I haven't called yet.", "already/just/still suelen ir antes del verbo principal; yet suele ir al final en preguntas y negativas; soon/recently también pueden ir al final."],
      ["MANNER", "well, quickly, slowly, carefully explican cómo se hace algo.", "She speaks clearly. · He opened it carefully.", "Normalmente después del verbo y del objeto: She answered the question carefully. No separes verbo y objeto."],
      ["PLACE", "here, there, everywhere, somewhere, anywhere indican dónde.", "Put it there. · We looked everywhere.", "Normalmente después del verbo o del objeto: I saw him there. También al principio para dar énfasis: Here comes the bus."],
      ["DEGREE", "very, really, quite, too, almost, enough modifican intensidad o cantidad.", "It's very cold. · She runs really fast. · It's warm enough.", "Antes del adjetivo/adverbio: very tired; enough va después del adjetivo/adverbio: old enough, y antes del nombre: enough time."],
      ["COMMENT / LINKING", "fortunately, probably, however, therefore expresan actitud, probabilidad o relación entre ideas.", "Probably, she'll call. · It was late; however, we stayed.", "Al principio con coma es muy claro; probably también puede ir antes del verbo principal o después de be: She'll probably come / She is probably right."]
    ],
    note: "Primero identifica qué modifica el adverbio: frecuencia, tiempo, modo, lugar, intensidad o toda la oración. La posición cambia según la categoría; no coloques todos como si fueran iguales."
  }
};
const verbReference = [
  ["be", "was/were", "been", "ser/estar", "I have been very busy today."],
  ["become", "became", "become", "convertirse", "She became a doctor."],
  ["begin", "began", "begun", "empezar", "The meeting began at nine."],
  ["break", "broke", "broken", "romper", "Be careful not to break it."],
  ["bring", "brought", "brought", "traer", "Please bring your passport."],
  ["build", "built", "built", "construir", "They built a new bridge."],
  ["buy", "bought", "bought", "comprar", "I bought some bread."],
  ["catch", "caught", "caught", "coger/atrapar", "I caught the last train."],
  ["choose", "chose", "chosen", "elegir", "Choose any seat you like."],
  ["come", "came", "come", "venir", "Can you come tomorrow?"],
  ["cost", "cost", "cost", "costar", "How much did it cost?"],
  ["cut", "cut", "cut", "cortar", "Cut the paper in half."],
  ["do", "did", "done", "hacer", "I have done my homework."],
  ["draw", "drew", "drawn", "dibujar", "She drew a map."],
  ["drink", "drank", "drunk", "beber", "He has drunk enough water."],
  ["drive", "drove", "driven", "conducir", "She drove to work."],
  ["eat", "ate", "eaten", "comer", "Have you eaten yet?"],
  ["fall", "fell", "fallen", "caer", "The leaves have fallen."],
  ["feel", "felt", "felt", "sentir(se)", "I felt better after resting."],
  ["find", "found", "found", "encontrar", "I found my keys."],
  ["fly", "flew", "flown", "volar", "They have flown to Madrid."],
  ["forget", "forgot", "forgotten", "olvidar", "Don't forget your coat."],
  ["get", "got", "got/gotten", "obtener/llegar/ponerse", "I got home late."],
  ["give", "gave", "given", "dar", "She gave me good advice."],
  ["go", "went", "gone", "ir", "We went to the cinema."],
  ["grow", "grew", "grown", "crecer", "The plant has grown quickly."],
  ["have", "had", "had", "tener", "I had a great time."],
  ["hear", "heard", "heard", "oír", "I heard a strange noise."],
  ["hold", "held", "held", "sujetar/mantener", "Hold the door, please."],
  ["keep", "kept", "kept", "guardar/mantener", "Keep this receipt."],
  ["know", "knew", "known", "saber/conocer", "I have known her for years."],
  ["leave", "left", "left", "dejar/salir", "The train left on time."],
  ["lend", "lent", "lent", "prestar", "Could you lend me a pen?"],
  ["let", "let", "let", "dejar/permitir", "Let me help you."],
  ["lose", "lost", "lost", "perder", "I lost my ticket."],
  ["make", "made", "made", "hacer/fabricar", "Let's make a plan."],
  ["mean", "meant", "meant", "significar", "What does this word mean?"],
  ["meet", "met", "met", "conocer/reunirse", "We met at work."],
  ["pay", "paid", "paid", "pagar", "I paid by card."],
  ["put", "put", "put", "poner", "Put your bag here."],
  ["read", "read", "read", "leer", "I read it yesterday."],
  ["ride", "rode", "ridden", "montar", "She has ridden a horse."],
  ["ring", "rang", "rung", "sonar/llamar", "The phone rang twice."],
  ["run", "ran", "run", "correr", "He runs every morning."],
  ["say", "said", "said", "decir", "She said hello."],
  ["see", "saw", "seen", "ver", "Have you seen my phone?"],
  ["sell", "sold", "sold", "vender", "They sold their house."],
  ["send", "sent", "sent", "enviar", "I sent the email."],
  ["set", "set", "set", "colocar/fijar", "Set an alarm for seven."],
  ["show", "showed", "shown", "mostrar", "He showed me the way."],
  ["sing", "sang", "sung", "cantar", "She has sung on stage."],
  ["sit", "sat", "sat", "sentarse", "Please sit down."],
  ["sleep", "slept", "slept", "dormir", "I slept badly last night."],
  ["speak", "spoke", "spoken", "hablar", "She speaks three languages."],
  ["spend", "spent", "spent", "gastar/pasar tiempo", "We spent the afternoon outside."],
  ["stand", "stood", "stood", "estar de pie", "He stood by the door."],
  ["steal", "stole", "stolen", "robar", "Someone stole my bike."],
  ["swim", "swam", "swum", "nadar", "They swam in the sea."],
  ["take", "took", "taken", "coger/llevar", "Take an umbrella."],
  ["teach", "taught", "taught", "enseñar", "She taught me English."],
  ["tell", "told", "told", "decir/contar", "Tell me the truth."],
  ["think", "thought", "thought", "pensar", "I thought about it."],
  ["throw", "threw", "thrown", "lanzar", "He threw the ball."],
  ["understand", "understood", "understood", "entender", "I understood the question."],
  ["wake", "woke", "woken", "despertarse", "I woke up early."],
  ["wear", "wore", "worn", "llevar puesto", "She wore a blue dress."],
  ["win", "won", "won", "ganar", "Our team won."],
  ["write", "wrote", "written", "escribir", "I have written the report."]
];
const adverbReference = [
  ["always", "frecuencia", "siempre", "I always check my email."], ["usually", "frecuencia", "normalmente", "I usually walk to work."], ["often", "frecuencia", "a menudo", "We often eat together."], ["sometimes", "frecuencia", "a veces", "She sometimes works late."], ["rarely", "frecuencia", "raramente", "He rarely watches TV."], ["never", "frecuencia", "nunca", "I never skip breakfast."],
  ["already", "tiempo", "ya", "I've already finished."], ["still", "tiempo", "todavía", "Are you still working?"], ["just", "tiempo", "justo/ahora mismo", "I've just arrived."], ["yet", "tiempo", "todavía/ya", "Have you called yet?"], ["soon", "tiempo", "pronto", "See you soon."], ["recently", "tiempo", "recientemente", "I recently moved here."], ["lately", "tiempo", "últimamente", "Have you been busy lately?"],
  ["here", "lugar", "aquí", "Come here, please."], ["there", "lugar", "allí", "Put it there."], ["everywhere", "lugar", "en todas partes", "I looked everywhere."], ["somewhere", "lugar", "en algún sitio", "Let's go somewhere quiet."], ["anywhere", "lugar", "en cualquier sitio", "You can sit anywhere."],
  ["quickly", "modo", "rápidamente", "She answered quickly."], ["slowly", "modo", "lentamente", "Please speak slowly."], ["carefully", "modo", "cuidadosamente", "Read the instructions carefully."], ["easily", "modo", "fácilmente", "You can easily find it."], ["quietly", "modo", "en silencio", "He closed the door quietly."], ["well", "modo", "bien", "You speak English well."], ["badly", "modo", "mal", "I slept badly."],
  ["very", "grado", "muy", "It's very cold."], ["quite", "grado", "bastante", "It's quite difficult."], ["too", "grado", "demasiado/también", "It's too expensive."], ["enough", "grado", "suficientemente", "Are you old enough?"], ["almost", "grado", "casi", "It's almost ready."], ["really", "grado", "realmente", "I really like it."], ["especially", "grado", "especialmente", "I like fruit, especially apples."],
  ["fortunately", "comentario", "afortunadamente", "Fortunately, nobody was hurt."], ["probably", "probabilidad", "probablemente", "She'll probably come."], ["maybe", "probabilidad", "quizá", "Maybe he's busy."], ["definitely", "probabilidad", "sin duda", "I'll definitely call you."], ["perhaps", "probabilidad", "quizá", "Perhaps we should wait."],
  ["however", "conector", "sin embargo", "It was hard; however, we finished."], ["therefore", "conector", "por lo tanto", "It was late; therefore, we left."], ["instead", "conector", "en lugar de", "Let's walk instead."], ["also", "conector", "también", "She also speaks French."], ["otherwise", "conector", "si no/de lo contrario", "Hurry up, otherwise we'll be late."]
];
const adjectiveReference = [
  ["able", "capaz", "I am able to help."], ["accurate", "preciso", "The information is accurate."], ["active", "activo", "She leads an active life."], ["afraid", "asustado", "I'm afraid of dogs."], ["amazing", "increíble", "That was an amazing result."], ["ancient", "antiguo", "We visited an ancient city."], ["available", "disponible", "Is this room available?"], ["aware", "consciente", "Are you aware of the risks?"], ["basic", "básico", "These are the basic rules."], ["beautiful", "bonito", "What a beautiful view!"], ["brave", "valiente", "She was brave."], ["brief", "breve", "We had a brief meeting."], ["bright", "luminoso/brillante", "The room is bright."], ["broad", "amplio", "He has broad experience."], ["busy", "ocupado", "I'm busy this afternoon."], ["calm", "tranquilo", "Try to stay calm."], ["careful", "cuidadoso", "Be careful with that glass."], ["certain", "seguro", "I'm certain it's correct."], ["cheap", "barato", "This ticket is cheap."], ["clear", "claro", "The instructions are clear."], ["clever", "inteligente", "That's a clever idea."], ["comfortable", "cómodo", "These shoes are comfortable."], ["confident", "seguro de sí mismo", "She feels confident now."], ["confused", "confuso", "I was confused by the question."], ["convenient", "práctico", "The location is convenient."], ["crowded", "abarrotado", "The train was crowded."], ["curious", "curioso", "Children are naturally curious."], ["dangerous", "peligroso", "That road is dangerous."], ["deep", "profundo", "The lake is deep."], ["different", "diferente", "We have different opinions."], ["difficult", "difícil", "This exercise is difficult."], ["disappointed", "decepcionado", "He was disappointed."], ["early", "temprano", "I arrived early."], ["effective", "eficaz", "This is an effective method."], ["efficient", "eficiente", "She is very efficient."], ["empty", "vacío", "The room is empty."], ["equal", "igual", "Everyone should have equal opportunities."], ["essential", "esencial", "Sleep is essential."], ["excited", "emocionado", "I'm excited about the trip."], ["fair", "justo", "That seems fair."], ["familiar", "familiar", "The name sounds familiar."], ["famous", "famoso", "It's a famous painting."], ["friendly", "amable", "Our neighbours are friendly."], ["frightened", "asustado", "The child was frightened."], ["generous", "generoso", "That was very generous."], ["gentle", "suave", "Use a gentle voice."], ["glad", "contento", "I'm glad you're here."], ["grateful", "agradecido", "I'm grateful for your help."], ["healthy", "saludable", "A balanced diet is healthy."], ["honest", "honesto", "Please be honest."], ["huge", "enorme", "They live in a huge house."], ["impatient", "impaciente", "Don't be impatient."], ["important", "importante", "This is important."], ["independent", "independiente", "She is very independent."], ["kind", "amable", "He is kind to everyone."], ["lazy", "perezoso", "I feel lazy today."], ["likely", "probable", "It's likely to rain."], ["lonely", "solo", "He felt lonely."], ["lucky", "afortunado", "We were lucky."], ["modern", "moderno", "It's a modern building."], ["narrow", "estrecho", "The street is narrow."], ["natural", "natural", "Try to sound natural."], ["nervous", "nervioso", "I feel nervous before exams."], ["obvious", "obvio", "The answer is obvious."], ["ordinary", "normal", "It was an ordinary day."], ["patient", "paciente", "You need to be patient."], ["polite", "educado", "She was polite."], ["possible", "posible", "Is it possible?"], ["practical", "práctico", "That's practical advice."], ["proud", "orgulloso", "I'm proud of you."], ["quiet", "tranquilo/silencioso", "It's quiet here."], ["reliable", "fiable", "He is reliable."], ["similar", "parecido", "The two plans are similar."], ["simple", "sencillo", "The solution is simple."], ["skillful", "hábil", "She is a skillful cook."], ["strange", "extraño", "That sounds strange."], ["successful", "exitoso", "The project was successful."], ["tasty", "sabroso", "The soup is tasty."], ["tired", "cansado", "I'm tired today."], ["useful", "útil", "This tip is useful."], ["various", "varios", "We discussed various options."], ["warm", "cálido", "The room is warm."], ["worried", "preocupado", "I'm worried about him."]
];
function lesson(id, preserveStep = false) {
  const item = curriculum.find(l => l.id === id) || curriculum[0];
  if (!preserveStep && state.lessonId !== id) { state.lessonId = id; state.lessonStep = 0; }
  const related = vocabularyCatalog.filter(word => item.phrase.toLowerCase().includes(word.word.toLowerCase())).slice(0, 4);
  const step = state.lessonStep || 0;
  const guide = item.guideKey ? grammarGuides[item.guideKey] : null;
  const steps = guide ? [
    `<span class="tag">Paso 1 de 4 · La idea central</span><h3>${guide.title}</h3><p class="muted">Mira primero el contexto: no traduzcas cada palabra de forma automática.</p><div class="grammar-table">${guide.rows.map(([label, use, examples, placement]) => `<div><strong>${label}</strong><span>${use}</span><b>${examples}</b>${placement ? `<small class="grammar-position"><b>Colocación:</b> ${placement}</small>` : ""}</div>`).join("")}</div>`,
    `<span class="tag">Paso 2 de 4 · Contrasta</span><h3>La diferencia aparece al cambiar la intención</h3><div class="notice"><strong>Truco:</strong> ${guide.note}</div><p class="muted">Lee los ejemplos en voz alta y fíjate en qué palabra cambia cuando la frase pasa de afirmativa a pregunta o negativa.</p>${audioPlayer(guide.rows.map(row => row[2].split(" · ")[0]).join(" "))}`,
    `<span class="tag">Paso 3 de 4 · Recupera sin mirar</span><h3>Elige la lógica antes de la palabra</h3><button class="option" data-answer="right">Primero identifico si la frase es afirmativa, pregunta o negativa y si el nombre se puede contar.</button><button class="option" data-answer="wrong">Traduzco literalmente la palabra española y elijo la primera opción.</button>`,
    `<span class="tag">Paso 4 de 4 · Produce</span><h3>Usa la estructura en tu vida</h3><label>Escribe dos frases<textarea id="writing-answer" placeholder="Write two sentences using this grammar..."></textarea></label><p class="muted small">Incluye una afirmación y una pregunta o negativa para comparar.</p><button class="btn secondary" data-action="check-writing" data-expected="${item.phrase}">Comprobar mis frases</button><div id="writing-feedback"></div>`
  ] : item.guide ? [
    `<span class="tag">Paso 1 de 4 · La idea visual</span><h3>De lo grande a lo puntual</h3><p class="muted">No traduzcas siempre “en / sobre / a”. Elige según el tipo de relación:</p><div class="grammar-table"><div><strong>IN</strong><span>Dentro de un espacio o periodo amplio</span><b>in Spain · in a room · in July · in the morning</b></div><div><strong>ON</strong><span>Contacto con una superficie, un día o una fecha</span><b>on the table · on Monday · on 12 May</b></div><div><strong>AT</strong><span>Un punto, una hora o un lugar visto como actividad</span><b>at the door · at 8:00 · at work</b></div></div>${audioPlayer("I work at home on Monday in the morning.")}`,
    `<span class="tag">Paso 2 de 4 · Tiempo</span><h3>La regla que más vas a usar</h3><div class="grammar-table"><div><strong>IN</strong><span>meses, años, estaciones, siglos y partes del día</span><b>in April · in 2026 · in winter · in the evening</b></div><div><strong>ON</strong><span>días, fechas y día + parte del día</span><b>on Friday · on 26 October · on Friday night</b></div><div><strong>AT</strong><span>horas y momentos fijos</span><b>at 7:30 · at noon · at night · at the weekend (UK)</b></div></div><div class="notice"><strong>Excepciones importantes:</strong> decimos <em>at night</em>, no <em>in night</em>; pero <em>in the morning</em>. Con una fecha concreta: <em>on my birthday</em>, no <em>in my birthday</em>.</div>`,
    `<span class="tag">Paso 3 de 4 · Lugar y transporte</span><h3>Dentro, superficie o punto</h3><div class="grammar-table"><div><strong>IN</strong><span>ciudades, países, habitaciones y espacios cerrados</span><b>in London · in the kitchen · in a box</b></div><div><strong>ON</strong><span>superficies, calles, plantas y transporte público</span><b>on the wall · on King Street · on the bus</b></div><div><strong>AT</strong><span>punto concreto, evento o actividad</span><b>at the station · at a party · at work</b></div></div><div class="notice"><strong>Transporte:</strong> normalmente <em>on</em> the bus/train/plane, pero <em>in</em> a car/taxi porque estás dentro de un vehículo pequeño.</div>`,
    `<span class="tag">Paso 4 de 4 · Comprueba que lo sabes</span><h3>Completa las tres preposiciones</h3><p class="muted">Escribe una frase sobre tu vida que incluya una hora, un día y un lugar.</p><label>Tu frase<textarea id="writing-answer" placeholder="I work ... Monday ... the morning ..."></textarea></label><p class="muted small">Pista: hora = AT · día = ON · parte del día o periodo = IN.</p><button class="btn secondary" data-action="check-writing" data-expected="I work at home on Monday in the morning.">Comprobar mi frase</button><div id="writing-feedback"></div>`
  ] : [
    `<span class="tag">Paso 1 de 3 · Entender</span><h3>${item.tip}</h3><p class="muted">${item.description}</p><h2 class="selectable-phrase">${item.phrase.split(" ").map(word => `<button class="word-chip" data-action="save-word" data-word="${word.replace(/[?.!,]/g, "")}">${word}</button>`).join(" ")}</h2>${audioPlayer(item.phrase)}<p class="muted small">Escucha dos veces y guarda las palabras nuevas.</p>`,
    `<span class="tag">Paso 2 de 3 · Recuperar</span><h3>¿Qué idea expresa esta frase?</h3><button class="option" data-answer="right">La usaría en una situación real relacionada con ${item.topic || "este tema"}.</button><button class="option" data-answer="wrong">Solo sirve para traducir palabra a palabra.</button>`,
    `<span class="tag">Paso 3 de 3 · Producir</span><label>Escribe una frase parecida<textarea id="writing-answer" placeholder="Escribe aquí tu ejemplo en inglés..."></textarea></label><button class="btn secondary" data-action="check-writing" data-expected="${item.phrase}">Corregir mi frase</button><div id="writing-feedback"></div>`
  ];
  content.innerHTML = `<div class="quiz"><button class="pill-button" data-view="home">← Mi ruta</button><div class="eyebrow" style="margin-top:22px">${item.level} · ${item.minutes} min · ${item.skill}</div><h1>${item.title}</h1><div class="progress-bar"><i style="width:${((step + 1) / steps.length) * 100}%"></i></div><div class="card">${steps[step]}<div style="margin-top:20px">${step < steps.length - 1 ? `<button class="btn" data-action="next-lesson-step" data-lesson="${item.id}">Siguiente →</button>` : `<button class="btn" data-action="complete-lesson" data-lesson="${item.id}">He practicado esta lección ✓</button>`}</div></div></div>`;
}
function learn() {
  const filters = state.learnFilters || { topics: [], levels: [] };
  const selectedTopics = filters.topics.length ? filters.topics : topics.map(topic => topic.id);
  const selectedLevels = filters.levels.length ? filters.levels : vocabularyLevels.filter(level => level !== "all");
  const filteredLessons = curriculum.filter(item => selectedTopics.includes(item.topic) && selectedLevels.includes(item.level));
  content.innerHTML = `<div class="eyebrow">Elige tu camino</div><h1>Aprender por temas</h1><p class="muted">Combina varios temas y niveles. Los filtros se aplican juntos para crear una ruta que encaje contigo.</p><div class="card learn-filters"><div class="filter-heading"><strong>Temas</strong><button class="pill-button" data-action="clear-learn-filters">Limpiar filtros</button></div><div class="multi-filter">${topics.map(topic => `<button class="multi-filter-option${selectedTopics.includes(topic.id) ? " selected" : ""}" data-learn-filter="topic" data-value="${topic.id}" aria-pressed="${selectedTopics.includes(topic.id)}">${topic.icon} ${topic.title}</button>`).join("")}</div><div class="filter-heading"><strong>Niveles</strong></div><div class="multi-filter">${vocabularyLevels.filter(level => level !== "all").map(level => `<button class="multi-filter-option${selectedLevels.includes(level) ? " selected" : ""}" data-learn-filter="level" data-value="${level}" aria-pressed="${selectedLevels.includes(level)}">${level}</button>`).join("")}</div><p class="muted small">Puedes elegir varios temas y niveles a la vez. Si no seleccionas ninguno, se muestran todos.</p></div><div class="section-head"><h2>Temas disponibles</h2><span class="tag">${selectedTopics.length} temas · ${selectedLevels.join(", ")}</span></div><div class="cards">${topics.filter(topic => selectedTopics.includes(topic.id)).map(t => `<div class="card"><div class="lesson-icon">${t.icon}</div><h3>${t.title}</h3><p class="muted">${t.description}</p><div>${t.subs.map(s => `<span class="tag">${s}</span>`).join("")}</div><button class="btn secondary" data-topic="${t.id}">Explorar tema →</button></div>`).join("")}</div><div class="section-head"><h2>Lecciones que encajan</h2><span class="muted">${filteredLessons.length} resultados</span></div><div class="cards">${filteredLessons.length ? filteredLessons.map(item => `<div class="card"><span class="tag">${item.level} · ${item.minutes} min</span><h3>${item.title}</h3><p class="muted">${item.description}</p><button class="btn secondary" data-lesson="${item.id}">Empezar lección →</button></div>`).join("") : `<div class="card"><p class="muted">No hay lecciones con esta combinación. Prueba otro nivel o tema.</p></div>`}</div>`;
}
function grammar() {
  const grammarLessons = curriculum.filter(item => item.skill === "grammar");
  const levels = ["A1", "A2", "B1", "B2", "C1"];
  const levelNames = { A1: "Base esencial", A2: "Construir confianza", B1: "Comunicarse con precisión", B2: "Matices y fluidez", C1: "Dominio avanzado" };
  content.innerHTML = `<div class="eyebrow">Gramática práctica</div><h1>Aprende la gramática para usarla</h1><p class="muted">Cada tema sigue el mismo ciclo: entiende una regla corta, observa ejemplos, recupera la idea y úsala en una frase propia. No memorices tablas aisladas.</p><div class="card grammar-method"><h2>Cómo trabajar cada tema</h2><div class="grammar-method-steps"><span><b>1</b> Entiende</span><span><b>2</b> Compara ejemplos</span><span><b>3</b> Responde sin mirar</span><span><b>4</b> Produce tu frase</span></div><p class="muted small">Haz las lecciones en orden, vuelve a las que falles y repásalas después de uno, dos y cuatro días.</p></div>${levels.map(level => { const lessons = grammarLessons.filter(item => item.level === level); return lessons.length ? `<section class="grammar-level"><div class="section-head"><div><span class="eyebrow">${level}</span><h2>${levelNames[level]}</h2></div><span class="tag">${lessons.length} lecciones</span></div><div class="cards grammar-cards">${lessons.map(item => `<div class="card"><span class="tag">${item.minutes} min</span><h3>${item.title}</h3><p class="muted">${item.description}</p><p class="grammar-tip">💡 ${item.tip}</p><button class="btn secondary" data-lesson="${item.id}">Estudiar tema →</button></div>`).join("")}</div></section>` : ""; }).join("")}`;
}
function reference() {
  const tab = state.referenceTab || "verbs";
  const query = (state.referenceQuery || "").toLowerCase();
  const tabs = [["verbs", "Verbos · 3 formas"], ["adverbs", "Adverbios"], ["adjectives", "Adjetivos"]];
  const data = tab === "verbs" ? verbReference : tab === "adverbs" ? adverbReference : adjectiveReference;
  const filtered = data.filter(row => row.join(" ").toLowerCase().includes(query));
  const listen = text => `<button class="reference-audio" data-action="audio" data-text="${escapeHtml(text)}" aria-label="Escuchar ${escapeHtml(text)}">▶</button>`;
  content.innerHTML = `<div class="eyebrow">Tablas de consulta</div><h1>Palabras para tener a mano</h1><p class="muted">Consulta, escucha y guarda las palabras que quieras estudiar después. La tabla es un apoyo: aprende cada entrada también en una frase.</p><div class="reference-tabs">${tabs.map(([id, label]) => `<button class="pill-button${tab === id ? " active-reference-tab" : ""}" data-reference-tab="${id}">${label}</button>`).join("")}</div><input class="reference-search" data-reference-search value="${escapeHtml(state.referenceQuery || "")}" placeholder="Buscar una palabra o traducción..." aria-label="Buscar en la tabla"><div class="reference-count">${filtered.length} resultados</div>${tab === "verbs" ? `<div class="reference-table-wrap"><table class="reference-table"><thead><tr><th>Infinitivo</th><th>Pasado</th><th>Participio</th><th>Traducción</th><th>Ejemplo</th><th></th></tr></thead><tbody>${filtered.map(([base, past, participle, meaning, example]) => `<tr><td><strong>${base}</strong> ${listen(base)}</td><td>${past}</td><td>${participle}</td><td>${meaning}</td><td>${example} ${listen(example)}</td><td>${saveWordButton(base)}</td></tr>`).join("")}</tbody></table></div>` : `<div class="reference-grid">${filtered.map(([word, category, meaning, example]) => `<article class="card reference-card"><div><span class="tag">${category}</span><h3>${word} ${listen(word)}</h3><p>${meaning}</p><small>“${example}” ${listen(example)}</small></div>${saveWordButton(word)}</article>`).join("")}</div>`}`;
}
function topic(id) {
  const t = topics.find(item => item.id === id) || topics[0];
  const example = topicExamples[id] || topicExamples.work;
  content.innerHTML = `<div class="quiz"><button class="pill-button" data-view="learn">← Todos los temas</button><div class="eyebrow" style="margin-top:22px">${t.icon} ${t.title}</div><h1>${example.title}</h1><p class="muted">${t.description} Elige una subsección para seguir construyendo confianza.</p><div class="checkboxes">${t.subs.map(s => `<span class="check">${s}</span>`).join("")}</div><div class="card" style="margin-top:22px"><span class="tag">Frase útil · Bimba recomienda</span><h2 class="selectable-phrase">${example.phrase.split(" ").map(word => `<button class="word-chip" data-action="save-word" data-word="${word.replace(/[?.!,]/g, "")}">${word}</button>`).join(" ")}</h2><p>${example.meaning}</p><div class="learn-word-save"><span class="muted small">Palabra o expresión clave: <strong>${escapeHtml(example.word)}</strong></span>${saveWordButton(example.word, "Guardar en mi lista")}</div>${audioPlayer(example.phrase)}<p class="muted small">Puedes tocar cualquier palabra de la frase o guardar directamente la palabra clave. El corazón quedará marcado si ya está en tu lista.</p><hr><h3>¿En qué situación la usarías?</h3><button class="option" data-answer="right">En una conversación real relacionada con este tema</button><button class="option" data-answer="wrong">Solo al traducir palabra por palabra</button></div></div>`;
}
function series() { content.innerHTML = `<div class="eyebrow">Aprende con historias</div><h1>Series & escenas</h1><p class="muted">Escenas cortas originales, con humor y situaciones cotidianas.</p><div class="notice">No podemos mostrar clips de <em>Friends</em> ni copiar sus subtítulos sin licencia. Para que puedas aprender de forma legal, Bimba crea escenas propias con el mismo tipo de situaciones: amigos, planes, malentendidos y conversaciones naturales.</div><div class="cards"><div class="card series-card"><div class="series-thumb">☕</div><div><span class="tag">A2 · 3 min</span><h3>The coffee plan</h3><p class="muted">Dos amigas organizan el fin de semana y practican expresiones de acuerdo.</p><button class="btn secondary" data-series="coffee">Ver escena</button></div></div><div class="card series-card"><div class="series-thumb">🛋️</div><div><span class="tag">B1 · 4 min</span><h3>The surprise party</h3><p class="muted">Un grupo de amigos intenta guardar un secreto.</p><button class="btn secondary" data-series="party">Ver escena</button></div></div><div class="card series-card"><div class="series-thumb">📱</div><div><span class="tag">B1 · 5 min</span><h3>Work group chat</h3><p class="muted">Mensajes, bromas y cómo aclarar un malentendido.</p><button class="btn secondary" data-series="chat">Ver escena</button></div></div></div>`; }
function seriesScene(id) {
  const scenes = { coffee: ["The coffee plan", "Are you up for coffee this Saturday?", "¿Te apetece tomar un café este sábado?"], party: ["The surprise party", "Keep it quiet — it’s a surprise!", "No digas nada: ¡es una sorpresa!"], chat: ["Work group chat", "Sorry, I got the wrong end of the stick.", "Perdona, lo entendí completamente mal."] };
  const scene = scenes[id] || scenes.coffee;
  content.innerHTML = `<div class="quiz"><button class="pill-button" data-view="series">← Volver a escenas</button><div class="eyebrow" style="margin-top:22px">Escena original · ${scene[0]}</div><h1>${scene[0]}</h1><div class="card"><div class="series-thumb">🎬</div><h2>${scene[1]}</h2><p>${scene[2]}</p>${audioPlayer(scene[1])}<hr><h3>Repite la frase en voz alta</h3><p class="muted">Primero escucha. Después pausa, repite y vuelve a escuchar para comparar ritmo y entonación.</p><button class="btn secondary" data-action="repeat" data-text="${scene[1]}">🎙 Repetir conmigo</button></div></div>`;
}
function vocabulary() {
  const saved = state.vocabulary || [];
  content.innerHTML = `<div class="eyebrow">Tu memoria inteligente</div><h1>Mi vocabulario</h1><p class="muted">Guardar una palabra es el principio. Para aprenderla de verdad, recupérala sin mirar, úsala en una frase y vuelve a verla cuando toque.</p><div class="card vocabulary-method"><h2>Cómo estudiar cada palabra</h2><div class="vocabulary-method-steps"><div><b>1</b><strong>Contexto</strong><span>Escucha el ejemplo y entiende la situación.</span></div><div><b>2</b><strong>Recuperación</strong><span>Tapa la traducción e intenta recordarla.</span></div><div><b>3</b><strong>Producción</strong><span>Di o escribe una frase propia.</span></div><div><b>4</b><strong>Repaso</strong><span>Vuelve hoy, en 1, 2, 4 y 8 días.</span></div></div><p class="muted small">No marques “Lo sé” por reconocerla al verla: úsalo cuando puedas recordar el significado y construir una frase sin ayuda.</p><button class="btn secondary" data-view="practice">Practicar palabras ahora →</button></div><div class="card"><p><strong>${saved.length}</strong> palabras guardadas · <strong>${reviewDue().length}</strong> repasos pendientes</p>${saved.length ? saved.map(v => `<div class="word"><div><h3>${escapeHtml(v.word)} <span class="tag">${escapeHtml(v.type || "expresión")}</span></h3><small>${escapeHtml(v.meaning)} · “${escapeHtml(v.example)}”</small></div><div><button class="pill-button" data-action="audio" data-text="${escapeHtml(v.example)}">🔊</button>${saveWordButton(v.word, "Quitar")}<button class="pill-button" data-action="review-word" data-word="${escapeHtml(v.word)}">Lo sé</button></div></div>`).join("") : `<p class="muted">Guarda palabras desde cualquier tema para empezar tu lista.</p>`}</div>`;
}
function practice() {
  const filters = state.practiceFilters || { level: "all", type: "all", topic: "all", mode: "useful" };
  const source = filters.topic === "all" ? vocabularyCatalog : topicVocabulary(filters.topic, filters.mode);
  const pool = source.filter(item => (filters.level === "all" || item.level === filters.level) && (filters.type === "all" || item.type === filters.type));
  const item = pool[(state.practiceIndex || 0) % Math.max(pool.length, 1)] || vocabularyCatalog[0];
  const prompt = state.practiceMode || "translation";
  const answer = prompt === "translation" ? item.meaning : prompt === "fill" ? item.word : item.example.split(" ").map(word => word.replace(/[.,!?]/g, "")).sort(() => .5 - Math.random());
  const topicOptions = [{ id: "all", title: "Todos los temas" }, ...vocabTopics.map(topic => ({ id: topic.id, title: topic.title }))];
  const hasPrevious = (state.practiceIndex || 0) > 0;
  const solution = prompt === "order" ? item.example : answer;
  content.innerHTML = `<div class="quiz"><div class="eyebrow">Práctica activa · ${source.length} unidades disponibles</div><h1>Practicar palabras</h1><p class="muted">Elige nivel, tema y tipo. Después de responder, usa Anterior o Siguiente para continuar.</p><div class="filter-grid"><select data-practice-topic>${topicOptions.map(topic => `<option value="${topic.id}" ${filters.topic === topic.id ? "selected" : ""}>${topic.title}</option>`).join("")}</select><select data-practice-scope><option value="useful" ${filters.mode === "useful" ? "selected" : ""}>Unidades útiles</option><option value="unique" ${filters.mode === "unique" ? "selected" : ""}>Palabras únicas</option></select><select data-practice-level>${vocabularyLevels.map(level => `<option value="${level}" ${filters.level === level ? "selected" : ""}>${level === "all" ? "Todos los niveles" : level}</option>`).join("")}</select><select data-practice-type>${vocabularyPartOfSpeech.map(([value, label]) => `<option value="${value}" ${filters.type === value ? "selected" : ""}>${label}</option>`).join("")}</select><select data-practice-mode><option value="translation" ${prompt === "translation" ? "selected" : ""}>Traducción</option><option value="fill" ${prompt === "fill" ? "selected" : ""}>Completar frase</option><option value="order" ${prompt === "order" ? "selected" : ""}>Ordenar palabras</option></select></div><div class="card"><span class="tag">${item.level} · ${item.type} · ${item.frequency}</span><h2>${prompt === "translation" ? `¿Qué significa “${item.word}”?` : prompt === "fill" ? item.example.replace(new RegExp(item.word, "i"), "_____") : "Ordena las palabras para formar la frase"}</h2>${prompt === "order" ? `<p id="order-answer" class="selectable-phrase">${(state.orderAttempt || []).map(escapeHtml).join(" ") || "Pulsa cada palabra en orden"}</p><div class="word-order">${answer.map((word, index) => `<button data-order-word="${index}" data-word="${escapeHtml(word)}">${escapeHtml(word)}</button>`).join("")}</div><button class="btn" data-action="check-practice-order" data-expected="${escapeHtml(item.example)}">Comprobar frase</button>` : `<div class="exercise-answer"><input id="practice-answer" autocomplete="off" placeholder="${prompt === "translation" ? "Escribe la traducción..." : "Escribe la palabra que falta..."}"><button class="btn" data-action="check-practice" data-answer="${escapeHtml(answer)}" data-word="${escapeHtml(item.word)}">Comprobar</button></div>`}<div class="practice-help"><button class="pill-button" data-action="reveal-practice" data-solution="${escapeHtml(solution)}" data-word="${escapeHtml(item.word)}">Mostrar respuesta</button><span class="muted small">Si la miras, volverá a tu repaso.</span></div><div id="practice-feedback"></div>${audioPlayer(item.example)}${saveWordButton(item.word)}<div class="practice-navigation"><button class="btn secondary" data-action="practice-previous" ${hasPrevious ? "" : "disabled"}>← Anterior</button><span class="muted">Palabra ${(state.practiceIndex || 0) + 1} de ${source.length}</span><button class="btn pink" data-action="practice-next">Siguiente →</button></div></div></div>`;
}
function vocabularyTopics() { content.innerHTML = `<div class="eyebrow">Palabras que puedes usar</div><h1>Vocabulario por temas</h1><p class="muted">Cada tema combina palabras únicas con unidades útiles: expresiones, colocaciones y phrasal verbs. El progreso se guarda por tema.</p><div class="cards">${vocabTopics.map(t => { const useful = topicVocabulary(t.id, "useful"); const unique = topicVocabulary(t.id, "unique"); const progress = topicProgress(t.id); return `<div class="card vocab-topic"><div class="lesson-icon">${t.icon}</div><div><h3>${t.title}</h3><p class="muted">${unique.length} palabras únicas · ${useful.length} unidades útiles · ${t.sections.length} subtemas</p><div class="progress-track"><span style="width:${progress.percentage}%"></span></div><small class="muted">${progress.percentage}% dominado · ${progress.learned}/${progress.total}</small><br><button class="btn secondary" data-vocab-topic="${t.id}">Ver subtemas →</button></div></div>`; }).join("")}</div>`; }
function vocabularyTopic(id) {
  const topic = vocabTopics.find(t => t.id === id) || vocabTopics[0];
  const grouped = Object.entries(topicVocabulary(topic.id).reduce((groups, item) => {
    (groups[item.subtopic] ||= []).push(item);
    return groups;
  }, {}));
  content.innerHTML = `<div class="quiz"><button class="pill-button" data-view="vocabularyTopics">← Todos los temas</button><div class="eyebrow" style="margin-top:22px">${topic.icon} Vocabulario</div><h1>${topic.title}</h1><p class="muted">${topic.description} Ahora puedes entrar en cada subtema del catálogo amplio, no solo en la muestra inicial.</p><div class="cards">${grouped.map(([subtopic, words]) => `<div class="card"><span class="tag">Catálogo editorial · ${words.length} unidades</span><h3>${escapeHtml(subtopic)}</h3><p class="muted">${words.filter(item => item.type === "word").length} palabras · ${words.filter(item => item.type !== "word").length} expresiones y unidades</p><button class="btn secondary" data-vocab-section="${topic.id}|editorial|${encodeURIComponent(subtopic)}">Abrir subtema →</button></div>`).join("")}</div></div>`;
}
function vocabularySection(topicId, index, encodedSubtopic) {
  const topic = vocabTopics.find(t => t.id === topicId) || vocabTopics[0];
  const editorial = index === "editorial";
  const subtopic = encodedSubtopic ? decodeURIComponent(encodedSubtopic) : "";
  const words = editorial ? topicVocabulary(topic.id).filter(item => !subtopic || item.subtopic === subtopic) : (topic.sections[Number(index)] || topic.sections[0])[1].map(([word, meaning, example]) => ({ word, meaning, example, type: "word" }));
  const title = editorial ? (subtopic || "Catálogo editorial") : (topic.sections[Number(index)] || topic.sections[0])[0];
  content.innerHTML = `<div class="quiz"><button class="pill-button" data-vocab-topic="${topic.id}">← ${topic.title}</button><div class="eyebrow" style="margin-top:22px">${topic.icon} ${topic.title}</div><h1>${escapeHtml(title)}</h1><p class="muted">${words.length} unidades. Escucha, mira el ejemplo y guarda lo que quieras repasar.</p><div class="card">${words.map(item => `<div class="word"><div><h3>${escapeHtml(item.word)} <span class="tag">${escapeHtml(item.meaning)} · ${escapeHtml(item.cefr || "A2")} · ${escapeHtml(item.type || "word")}</span></h3><small>“${escapeHtml(item.example)}”</small></div><div><button class="pill-button" data-action="audio" data-text="${escapeHtml(item.example)}">🔊</button>${saveWordButton(item.word, "Guardar")}</div></div>`).join("")}</div></div>`;
}
function library() { content.innerHTML = `<div class="eyebrow">Aprende a tu manera</div><h1>Lecciones sueltas</h1><p class="muted">Elige cualquier lección sin cambiar tu ruta diaria. La práctica se guardará igualmente.</p><div class="cards">${curriculum.map(item => `<div class="card"><span class="tag">${item.level} · ${item.minutes} min</span><h3>${item.title}</h3><p class="muted">${item.description}</p><button class="btn secondary" data-lesson="${item.id}">Hacer lección →</button></div>`).join("")}</div>`; }
function progress() { const skills = Object.entries(state.skills || {}); const errors = state.errors || []; content.innerHTML = `<div class="eyebrow">Mira cómo avanzas</div><h1>Tu progreso real</h1><p class="muted">Bimba ajusta tus siguientes lecciones según lo que practicas y completas.</p><div class="card"><h2>Habilidades</h2>${skills.map(([key, value]) => `<div style="margin:16px 0"><div style="display:flex;justify-content:space-between"><strong>${({ grammar: "Gramática", vocabulary: "Vocabulario", listening: "Escucha", speaking: "Conversación", pronunciation: "Pronunciación" })[key] || key}</strong><span>${value}%</span></div><div class="progress-bar"><i style="width:${value}%"></i></div></div>`).join("")}</div><div class="card"><h2>Errores recurrentes</h2>${errors.length ? errors.map(error => `<p class="notice">↻ ${escapeHtml(error)}</p>`).join("") : `<p class="muted">Todavía no hay errores recurrentes. Practicar y equivocarte forma parte del aprendizaje.</p>`}</div><div class="card"><h2>Logros</h2><span class="tag">${state.completed.length >= 5 ? "🏅 5 lecciones" : "🌱 Primeros pasos"}</span> <span class="tag">${state.vocabulary.length >= 10 ? "📚 10 palabras" : "📝 Guarda palabras"}</span><span class="tag">${state.streak >= 7 ? "🔥 7 días" : "🔥 Racha activa"}</span></div><div class="section-head"><h2>Tu consejo de hoy</h2></div><div class="card"><h3>💡 Aprende en frases, no en listas</h3><p class="muted">Cuando guardes una palabra, practica también una frase propia. Así tu cerebro aprende cuándo y cómo usarla.</p></div>`; }
function week() {
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const level = state.plan?.level || "A2";
  const done = new Set(state.completed || []);
  const weakSkills = Object.entries(state.skills || {}).sort(([, a], [, b]) => a - b).map(([skill]) => skill);
  const bySkill = skill => curriculum.filter(item => item.level === level && item.skill === skill && !done.has(item.id));
  const chosen = [];
  [...weakSkills, "grammar", "vocabulary", "listening", "speaking", "pronunciation"].forEach(skill => {
    const item = bySkill(skill).find(candidate => !chosen.includes(candidate));
    if (item && chosen.length < 7) chosen.push(item);
  });
  curriculum.filter(item => !done.has(item.id) && !chosen.includes(item)).slice(0, 7 - chosen.length).forEach(item => chosen.push(item));
  content.innerHTML = `<div class="eyebrow">Tu calendario</div><h1>Plan inteligente de esta semana</h1><p class="muted">Distribuye gramática, vocabulario, escucha, conversación y pronunciación. Las tareas pendientes se priorizan al recalcular tu ruta.</p><div class="card"><strong>Prioridad actual:</strong> ${weakSkills.slice(0, 3).map(skill => `<span class="tag">${skill}</span>`).join("")}</div><div class="week-grid">${days.map((day, i) => { const item = chosen[i]; const completed = item && done.has(item.id); return `<div class="card week-day"><span class="tag">${day}</span><h3>${item ? item.title : "Repaso libre"}</h3><p class="muted">${item ? `${item.minutes} min · ${item.level} · ${item.skill}` : "Vocabulario y errores"}</p><span class="${completed ? "done" : "pending"}">${completed ? "✓ Completada" : "Pendiente"}</span>${item && !completed ? `<button class="pill-button" data-lesson="${item.id}">Hacer</button>` : ""}</div>`; }).join("")}</div>`;
}
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
function speaking() {
  const scenarios = [
    ["daily", "Contar tu día", "Could you tell me about your day?", "Rutina y conversación informal"],
    ["work", "Entrevista de trabajo", "Why would you be a good fit for this role?", "Trabajo y carrera"],
    ["travel", "En un hotel", "There seems to be a problem with my room.", "Viajes y resolución de problemas"],
    ["health", "En el médico", "I have had this pain since yesterday.", "Salud y síntomas"]
  ];
  const selected = state.speakingScenario || 0;
  const scenario = scenarios[selected];
  const prompt = scenario[2];
  content.innerHTML = `<div class="quiz"><div class="eyebrow">Hablar y pronunciar</div><h1>Practica una respuesta real</h1><p class="muted">Primero escucha la pregunta y después responde por escrito o con el micrófono. Así siempre puedes completar la actividad, aunque tu navegador no admita transcripción.</p><div class="checkboxes">${scenarios.map((item, index) => `<button class="check ${selected === index ? "active" : ""}" data-speaking-scenario="${index}">${item[1]}</button>`).join("")}</div><div class="card"><span class="tag">A2-B1 · ${scenario[3]}</span><h2>${prompt}</h2>${audioPlayer(prompt)}<label>Tu respuesta en inglés<textarea id="speaking-answer" placeholder="Write 2–4 sentences in English..."></textarea></label><div class="speaking-actions"><button class="btn pink" data-action="check-speaking">Comprobar respuesta</button><button class="btn secondary" data-action="record">🎙 Usar micrófono</button><button class="btn secondary" data-action="stop-record">Detener</button></div><div id="recording-status" class="recording-status"></div><div id="transcript" class="transcript">La transcripción aparecerá aquí si Safari o tu navegador la admite.</div><div id="speaking-feedback"></div><p class="muted small">Una respuesta útil tiene sujeto + verbo y al menos un detalle. La corrección es orientativa.</p></div></div>`;
}
function onboarding() { content.innerHTML = `<div class="onboarding"><div class="card"><div class="eyebrow">Bienvenida a Bimba English</div><h1>Aprende inglés para tu vida real.</h1><p class="muted">Lecciones adaptadas a tu nivel, tus objetivos y lo que haces cada día.</p><div class="notice">Puedes crear tu perfil y hacer un diagnóstico corto. Después Bimba preparará tu ruta diaria.</div><button class="btn" data-action="setup">Crear mi perfil →</button><button class="btn secondary" data-action="start-diagnostic" style="margin-left:8px">Hacer diagnóstico</button></div></div>`; }
function render() { if (!state.user && currentView === "home") return onboarding(); ({ home, learn, grammar, reference, series, vocabulary, vocabularyTopics, vocabularyTopic, library, progress, week, profile, auth, diagnostic, practice, resetPassword }[currentView] || home)(); }

document.querySelector("#main-nav").addEventListener("click", e => { const button = e.target.closest("[data-view]"); if (button) setView(button.dataset.view); });
document.querySelector("#profile-button").addEventListener("click", () => setView("profile"));
document.querySelector("#auth-button").addEventListener("click", () => setView("auth"));
document.querySelector("#back-button").addEventListener("click", goBack);
document.querySelector("#menu-button").addEventListener("click", () => { document.querySelector("#sidebar")?.classList.add("open"); document.querySelector("#menu-scrim")?.classList.add("open"); });
document.querySelector("#menu-scrim").addEventListener("click", () => { document.querySelector("#sidebar")?.classList.remove("open"); document.querySelector("#menu-scrim")?.classList.remove("open"); });
document.addEventListener("click", async e => {
  if (document.querySelector(".theme-menu") && !e.target.closest("#theme-button, .theme-menu")) document.querySelector(".theme-menu").remove();
  const view = e.target.closest("[data-view]"); if (view) return setView(view.dataset.view);
  const referenceTab = e.target.closest("[data-reference-tab]")?.dataset.referenceTab;
  if (referenceTab) { state.referenceTab = referenceTab; return render(); }
  const topicId = e.target.closest("[data-topic]")?.dataset.topic; if (topicId) return topic(topicId);
  const vocabId = e.target.closest("[data-vocab-topic]")?.dataset.vocabTopic; if (vocabId) return vocabularyTopic(vocabId);
  const vocabSection = e.target.closest("[data-vocab-section]")?.dataset.vocabSection; if (vocabSection) { const [topicId, index, subtopic] = vocabSection.split("|"); return vocabularySection(topicId, index, subtopic); }
  const seriesId = e.target.closest("[data-series]")?.dataset.series; if (seriesId) return seriesScene(seriesId);
  const lessonId = e.target.closest("[data-lesson]")?.dataset.lesson;
  if (lessonId && !e.target.closest("[data-action=complete-lesson]")) return lesson(lessonId);
  const action = e.target.closest("[data-action]")?.dataset.action;
  if (e.target.closest("#theme-button")) {
    const menu = document.querySelector(".theme-menu");
    if (menu) return menu.remove();
    const themes = ["pink", "red", "blue", "green", "purple", "orange", "yellow"];
    const selected = localStorage.getItem("bimba-theme") || "pink";
    document.body.insertAdjacentHTML("beforeend", `<div class="theme-menu" role="menu" aria-label="Elegir color">${themes.map(theme => `<button class="theme-swatch${theme === selected ? " selected" : ""}" data-theme="${theme}" role="menuitem" aria-label="${themeNames[theme]}" title="${themeNames[theme]}" style="--swatch:${themeColors[theme]}"></button>`).join("")}</div>`);
    return;
  }
  const selectedTheme = e.target.closest(".theme-swatch")?.dataset.theme;
  if (selectedTheme) { applyTheme(selectedTheme); document.querySelector(".theme-menu")?.remove(); return toast(`Color ${themeNames[selectedTheme].toLowerCase()} aplicado.`); }
  if (action === "setup") return setView("profile");
  const learnFilter = e.target.closest("[data-learn-filter]");
  if (learnFilter) {
    const type = learnFilter.dataset.learnFilter === "topic" ? "topics" : "levels";
    const current = new Set(state.learnFilters?.[type] || []);
    if (current.has(learnFilter.dataset.value)) current.delete(learnFilter.dataset.value);
    else current.add(learnFilter.dataset.value);
    state.learnFilters = { ...(state.learnFilters || { topics: [], levels: [] }), [type]: [...current] };
    return render();
  }
  if (action === "clear-learn-filters") {
    state.learnFilters = { topics: [], levels: [] };
    return render();
  }
  if (action === "next-lesson-step") {
    const lessonItem = curriculum.find(item => item.id === e.target.closest("[data-action=next-lesson-step]").dataset.lesson);
    const stepCount = lessonItem?.guide || lessonItem?.guideKey ? 4 : 3;
    state.lessonStep = Math.min(stepCount - 1, (state.lessonStep || 0) + 1);
    return lesson(lessonItem?.id, true);
  }
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
  if (action === "check-speaking") {
    const answer = document.querySelector("#speaking-answer")?.value.trim() || "";
    const feedback = document.querySelector("#speaking-feedback");
    const words = answer.split(/\s+/).filter(Boolean);
    const hasSubject = /\b(I|you|he|she|we|they|my|the)\b/i.test(answer);
    const hasVerb = /\b(am|is|are|have|has|work|live|would|can|went|go|like|need|feel|think|want)\w*/i.test(answer);
    if (!answer) {
      feedback.innerHTML = `<div class="feedback error">Escribe o dicta una respuesta antes de comprobarla.</div>`;
      return;
    }
    if (hasSubject && hasVerb && words.length >= 5) {
      state.skills.speaking = Math.min(100, (state.skills.speaking || 0) + 3);
      feedback.innerHTML = `<div class="feedback">✅ Buena respuesta: tiene estructura y suficiente detalle. Ahora intenta decirla en voz alta.</div>`;
    } else {
      feedback.innerHTML = `<div class="feedback error">💡 Añade un sujeto, un verbo y un detalle más. Por ejemplo: “I work with customers, and I enjoy solving problems.”</div>`;
    }
    await save();
    return;
  }
  const speakingScenario = e.target.closest("[data-speaking-scenario]")?.dataset.speakingScenario;
  if (speakingScenario !== undefined) { state.speakingScenario = Number(speakingScenario); return render(); }
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
    if (isSavedWord(word)) {
      state.vocabulary = state.vocabulary.filter(item => item.word !== word);
      state.words = Math.max(0, (state.words || 0) - 1);
      await save();
      toast("Palabra quitada de tu vocabulario.");
      return render();
    }
    if (!isSavedWord(word)) {
      const catalogWord = getCatalogWord(word);
      state.vocabulary.unshift(catalogWord ? { ...catalogWord } : { word, meaning: "expresión guardada", type: "expresión", example: word });
      state.words++;
      markTopicProgress(word, "saved");
    }
    await addReview(word);
    toast("Expresión guardada en tu vocabulario.");
    return render();
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
    const hasVerb = /\b(am|is|are|was|were|be|work|works|worked|have|has|had|do|does|did|go|goes|went|like|likes|liked|can|could|will|would|should|need|needs|want|wants|make|makes|made)\b/i.test(answer);
    const rules = [
      [/\bI am agree\b/gi, "I agree", "Con agree usamos I agree, no I am agree."],
      [/\binterested on\b/gi, "interested in", "Interested va con la preposición in."],
      [/\bdepend of\b/gi, "depend on", "Depend va con on."],
      [/\bmarried with\b/gi, "married to", "Married va normalmente con to."],
      [/\bmore tall\b/gi, "taller", "Los adjetivos cortos forman el comparativo con -er."],
      [/\bmore cheap\b/gi, "cheaper", "Cheap forma el comparativo con -er."],
      [/\bpeople is\b/gi, "people are", "People es plural y necesita are."],
      [/\bhe go\b/gi, "he goes", "En presente simple, he/she/it necesita -s."],
      [/\bshe work\b/gi, "she works", "En presente simple, he/she/it necesita -s."],
      [/\byesterday I go\b/gi, "yesterday I went", "Con yesterday usamos pasado."],
      [/\bdid went\b/gi, "did go", "Después de did usamos el verbo en forma base."],
      [/\bdiscuss about\b/gi, "discuss", "Discuss no necesita about."],
      [/\bexplain me\b/gi, "explain to me", "Explain necesita to antes de la persona."],
      [/\bmake a photo\b/gi, "take a photo", "La colocación natural es take a photo."],
      [/\bdo a decision\b/gi, "make a decision", "La colocación natural es make a decision."]
    ];
    let corrected = answer;
    const notes = [];
    rules.forEach(([pattern, replacement, note]) => { if (pattern.test(corrected)) { corrected = corrected.replace(pattern, replacement); notes.push(note); } });
    const changed = corrected !== answer;
    const suggestions = [];
    if (!hasSubject) suggestions.push("incluye un sujeto (I, you, he, she, we o they)");
    if (!hasVerb) suggestions.push("incluye un verbo conjugado");
    if (answer.length < 12) suggestions.push("amplía la frase con un detalle de tiempo, lugar o motivo");
    const message = suggestions.length ? `💡 Prueba a ${suggestions.join(" y ")}.` : `✅ Buena base: hay sujeto y verbo.${changed ? ` Corrección sugerida: <strong>${escapeHtml(corrected)}</strong>` : " Ahora intenta añadir un detalle para hacerla más natural."}`;
    feedback.innerHTML = `<div class="notice">${message}${notes.length ? `<p class="muted"><strong>Por qué:</strong> ${notes.join(" ")}</p>` : ""}</div>`;
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
    } else {
      addReview(button.dataset.word, 4);
      markTopicProgress(button.dataset.word, "learned");
    }
    feedback.innerHTML = `<div class="feedback ${correct ? "" : "error"}">${correct ? "✅ Correcto. La recuperación activa ayuda a fijarlo." : `💡 La respuesta era “${escapeHtml(button.dataset.answer)}”. La añadimos a tus repasos.`}</div>`;
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
    state.orderAttempt = [];
    await save();
    return;
  }
  if (action === "reveal-practice") {
    const button = e.target.closest("[data-action=reveal-practice]");
    const feedback = document.querySelector("#practice-feedback");
    const word = button.dataset.word;
    addReview(word, 1);
    state.errors = [...new Set([...(state.errors || []), `vocabulario: ${word}`])];
    feedback.innerHTML = `<div class="feedback error">💡 Respuesta: <strong>${escapeHtml(button.dataset.solution)}</strong><br><span class="small">No pasa nada: la volveremos a practicar.</span></div>`;
    await save();
    return;
  }
  if (action === "practice-next") {
    const filters = state.practiceFilters || { level: "all", type: "all", topic: "all", mode: "useful" };
    const source = filters.topic === "all" ? vocabularyCatalog : topicVocabulary(filters.topic, filters.mode);
    const pool = source.filter(item => (filters.level === "all" || item.level === filters.level) && (filters.type === "all" || item.type === filters.type));
    state.practiceIndex = pool.length ? ((state.practiceIndex || 0) + 1) % pool.length : 0;
    state.orderAttempt = [];
    return render();
  }
  if (action === "practice-previous") {
    state.practiceIndex = Math.max(0, (state.practiceIndex || 0) - 1);
    state.orderAttempt = [];
    return render();
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
    try { return await enableNotifications(); } catch (error) { console.error(error); return toast("No se han podido activar los avisos. Revisa la configuración."); }
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
document.addEventListener("input", e => {
  if (!e.target.matches("[data-reference-search]")) return;
  state.referenceQuery = e.target.value;
  reference();
  const search = document.querySelector("[data-reference-search]");
  search?.focus();
  search?.setSelectionRange(state.referenceQuery.length, state.referenceQuery.length);
});
document.addEventListener("keydown", e => {
  if (e.key === "Escape") document.querySelector(".theme-menu")?.remove();
});
document.addEventListener("change", async e => {
  if (!["practice-topic", "practice-scope", "practice-level", "practice-type", "practice-mode"].some(name => e.target.matches(`[data-${name}]`))) return;
  state.practiceFilters = { topic: document.querySelector("[data-practice-topic]")?.value || "all", mode: document.querySelector("[data-practice-scope]")?.value || "useful", level: document.querySelector("[data-practice-level]")?.value || "all", type: document.querySelector("[data-practice-type]")?.value || "all" };
  state.practiceMode = document.querySelector("[data-practice-mode]")?.value || "translation";
  state.practiceIndex = 0;
  state.orderAttempt = [];
  render();
});

if (supabaseClient) supabaseClient.auth.getSession().then(({ data }) => { if (data.session) loadCloudState(data.session); });
if (supabaseClient) supabaseClient.auth.onAuthStateChange((event, session) => { if (event === "PASSWORD_RECOVERY") return setView("resetPassword"); if (session) loadCloudState(session); });
applyTheme(localStorage.getItem("bimba-theme") || "pink");
document.documentElement.dataset.dark = localStorage.getItem("bimba-dark") === "true" ? "true" : "false";
document.querySelector("#dark-button").addEventListener("click", () => { const dark = document.documentElement.dataset.dark !== "true"; document.documentElement.dataset.dark = dark ? "true" : "false"; localStorage.setItem("bimba-dark", String(dark)); });
if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("./sw.js").catch(() => {});
render();
