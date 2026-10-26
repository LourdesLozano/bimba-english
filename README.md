# Bimba English

MVP web responsive/PWA para aprender inglés con un plan adaptativo, perfil por objetivos, vocabulario y contenido tipo series. La identidad visual usa un oso panda.

## Ejecutar

Abre `index.html` en un navegador o sirve esta carpeta con un servidor estático. Para instalarla en iPhone: abre la URL en Safari, pulsa **Compartir → Añadir a pantalla de inicio**.

## Estado actual

- Perfil con nombre, nivel, objetivos múltiples y contexto laboral.
- Lecciones, progreso, racha y vocabulario guardados en `localStorage` como respaldo.
- Diseño responsive con navegación para móvil.
- Sección de escenas con diálogos propios tipo sitcom. Una app pública no debe copiar episodios o subtítulos de *Friends* sin licencia.
- Catálogo editorial de vocabulario para A1-C1, con traducciones y ejemplos revisados, filtros por nivel y categoría gramatical. Se han retirado las formas verbales automáticas que aparecían como palabras independientes.
- Ruta ampliada de gramática A1-C1, colocaciones y phrasal verbs por contexto.
- Situaciones nuevas de restaurante, devoluciones, llamadas, reclamaciones, descripción de imágenes, listening y pronunciación de `th` y palabras enlazadas.
- Banco ampliado de vocabulario editorial por salud, comida, casa, trabajo, viajes, compras, tecnología, naturaleza, estudios, dinero, vida social y personas.
- Arquitectura de corpus separada por tema en [`data/vocabulary/`](./data/vocabulary/). Cada ficha tiene ID estable, subtema, CEFR editorial, frecuencia, prioridad, tipo de unidad, variante regional, ejemplo original y ejercicios asociados.
- El primer lote grande de cocina está en [`data/vocabulary/food-expanded.js`](./data/vocabulary/food-expanded.js): ingredientes, sabores, dietas, platos, técnicas, medidas, utensilios, conservación, compra, seguridad y restaurante. La interfaz agrupa y abre cada subtema por separado.
- El lote transversal de ampliación está en [`data/vocabulary/themes-expanded.js`](./data/vocabulary/themes-expanded.js) y cubre casa, personas, trabajo, viajes, salud, compras, tecnología, naturaleza, estudios, dinero y vida social con subtemas reales.
- Dos modos de estudio: **unidades útiles** (palabras, expresiones, colocaciones y phrasal verbs) y **palabras únicas** (deduplicadas por tema). El catálogo legado se migra automáticamente para no perder contenido ni progreso.
- Progreso independiente por tema, con palabras guardadas, respuestas correctas y porcentaje sobre palabras únicas.
- Método de vocabulario basado en contexto, recuperación activa, producción propia y repaso espaciado; la lista guardada explica qué hacer en cada paso.
- Validador reproducible del contenido en [`scripts/validate-vocabulary.js`](./scripts/validate-vocabulary.js): detecta IDs repetidos, duplicados temáticos, campos incompletos, CEFR/tipos/frecuencia/prioridad inválidos y fichas sin ejercicios.
- Plan semanal inteligente que equilibra habilidades, nivel, objetivos, errores y lecciones pendientes.
- Ruta diaria adaptativa que muestra el motivo de cada recomendación, prioriza errores recientes y reserva los repasos pendientes.
- Corrección local ampliada para artículos de uso, preposiciones, comparativos, tiempos, concordancia, colocaciones y errores frecuentes de interferencia del español.
- Gramática contrastiva para palabras parecidas: `some/any/no`, `something/anything/nothing`, `someone/anyone/no one`, `somewhere/anywhere/nowhere`, cuantificadores y alternativas (`much/many`, `few/little`, `each/every`, `both/either/neither`, `another/other`).
- Pronombres por función: sujeto, objeto, posesivos, reflexivos, demostrativos, relativos e interrogativos, con ejemplos contrastivos.
- Las guías de gramática explican también la colocación: dónde va cada elemento respecto al verbo, objeto, nombre, auxiliar o preposición. La guía de adverbios distingue frecuencia, tiempo, modo, lugar, grado y conectores.
- Tablas de consulta con verbos frecuentes en infinitivo, pasado y participio, además de adverbios y adjetivos agrupados por uso. Incluyen búsqueda, ejemplos, escucha y guardado en el vocabulario personal.
- Lecciones nuevas A1-C1 con práctica de speaking, writing, listening, vocabulario, gramática y pronunciación.
- Ejercicios de traducción, completar frases y ordenar palabras.
- Repaso espaciado de palabras guardadas y errores de ejercicios.
- Repaso con intervalos progresivos, fecha del siguiente repaso y elección explícita entre “Me costó” y “Lo sabía”.
- Lecciones de gramática que enlazan sus frases con palabras del catálogo.
- Diagnóstico ampliado de 12 preguntas con dimensiones de gramática, vocabulario, escritura, escucha y pronunciación.
- Práctica de conversación con grabación y transcripción del navegador cuando el dispositivo lo permite.
- Recuperación de contraseña por email y avatar en Supabase Storage para cuentas sincronizadas.
- Lecciones guiadas en tres pasos, escenarios de conversación, modo oscuro, logros y errores recurrentes.
- Service worker para abrir el shell de la PWA cuando no haya conexión.
- Preparación para Web Push en iPhone: el service worker recibe avisos y Supabase guarda las suscripciones por usuario.
- Registro e inicio de sesión con Supabase.
- Sincronización del progreso por usuario entre dispositivos.
- Políticas RLS para que cada usuario solo pueda leer y modificar sus propios datos.

### Criterio para la gramática contrastiva

Las lecciones de palabras parecidas no enseñan listas para traducir literalmente:
presentan primero la intención (afirmación, pregunta, negación, elección o
cantidad), después comparan ejemplos mínimos y terminan con recuperación y una
frase propia. Se ha aplicado especialmente a:

- `some/any/no` y las familias `something/anything/nothing`,
  `someone/anyone/no one` y `somewhere/anywhere/nowhere`.
- `much/many`, `few/a few`, `little/a little`, `each/every/all`.
- `both/either/neither` y `another/other/the other/others`.

Las reglas se contrastaron con [British Council: indefinite pronouns and
quantifiers](https://learnenglish.britishcouncil.org/grammar/english-grammar-reference/quantifiers),
[Cambridge Dictionary: indefinite pronouns](https://dictionary.cambridge.org/grammar/british-grammar/pronouns-indefinite-pronouns),
y [Cambridge Dictionary: quantifiers](https://dictionary.cambridge.org/grammar/british-grammar/quantifiers).

## Configurar Supabase

1. En Supabase abre **SQL Editor** y crea una consulta nueva.
2. Copia el contenido de [`supabase/schema.sql`](./supabase/schema.sql), pégalo y pulsa **Run**.
3. En **Authentication → Providers → Email**, deja habilitado Email.
4. En **Authentication → URL Configuration**, añade la URL publicada de GitHub Pages cuando la tengas.
5. Si ya ejecutaste una versión anterior del esquema, vuelve a ejecutar el archivo completo para crear el bucket privado `avatars` y sus políticas.

`supabase-config.js` solo contiene la URL del proyecto y la publishable key. Nunca pongas en el repositorio una contraseña de base de datos, `service_role` key o cadena de conexión directa.

La conversación y la pronunciación usan APIs del navegador: Safari puede pedir permiso para el micrófono y no todos los dispositivos ofrecen transcripción. La app muestra feedback orientativo, no una certificación fonética.

## Ampliar el corpus sin perder calidad

Cada tema se mantiene en un archivo independiente dentro de [`data/vocabulary/`](./data/vocabulary/). Para añadir una ficha, usa el mismo esquema:

```js
{
  id: "food-new-item",
  theme: "food",
  subtopic: "Ingredients",
  word: "example",
  meaning: "traducción revisada",
  type: "word",
  cefr: "A2",
  frequency: "high",
  priority: 1,
  variant: "both",
  variantUk: "",
  variantUs: "",
  example: "An original example sentence.",
  exercises: ["translation", "gap", "audio"]
}
```

Antes de publicar un lote, ejecuta `node scripts/validate-vocabulary.js`. El validador exige **1.000 palabras únicas por tema como mínimo**, además de unidades útiles. Los recuentos que aparecen en la app son los que existen realmente en los archivos; no se inflarán cifras con formas verbales automáticas ni se copiarán libros, listas comerciales o subtítulos protegidos.

### Corpus ampliado reproducible

Los archivos `*-corpus.js` contienen 1.000 lemas adicionales por cada uno de los
12 temas. Se generaron desde el diccionario inglés-español
[`IvanDubls/llm_dictionary`](https://github.com/IvanDubls/llm_dictionary), publicado
bajo licencia MIT, conservando el ejemplo inglés de cada entrada y filtrando
duplicados, artículos aislados y entradas sin ejemplo. La fuente advierte que
sus traducciones fueron generadas con IA; por eso estas fichas están pensadas
como un lote amplio de trabajo y deben pasar una revisión editorial antes de
considerarse material certificado.

Para reproducir el lote, descarga `en_es_aidict.json` de esa fuente y ejecuta:

```bash
python3 scripts/build-vocabulary-corpus.py /ruta/a/en_es_aidict.json
```

El script usa `wordfreq` para priorizar vocabulario frecuente. Las coincidencias
temáticas claras se seleccionan primero y el resto se completa con vocabulario
general de comunicación para alcanzar el mínimo sin inventar palabras. La
atribución y la licencia de la fuente deben conservarse al redistribuir el lote.

## Funciones que requieren infraestructura adicional

- Las notificaciones push sin pagar requieren generar claves VAPID, guardar solo la clave pública en `supabase-config.js`, desplegar una función Edge que lea `push_subscriptions` y programar su ejecución. La clave privada debe quedarse en los secrets de Supabase; nunca en este repositorio. Safari/iPhone exige instalar la web en la pantalla de inicio y aceptar el permiso desde esa PWA.
- La función preparada está en [`supabase/functions/send-reminders/index.ts`](./supabase/functions/send-reminders/index.ts). Para activarla hay que configurar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `REMINDER_CRON_SECRET` como secrets, copiar la clave pública a `supabase-config.js` y ejecutar esa función con un programador seguro. La función usa la `service_role` únicamente en el servidor y nunca en el navegador.
- La corrección avanzada con IA requiere elegir un proveedor, definir límites de coste y decidir qué texto puede salir del dispositivo. La app mantiene ahora correcciones locales y no envía textos privados a terceros.

## Publicar

El proyecto es estático y puede publicarse con GitHub Pages. Activa **Settings → Pages → Deploy from a branch → main → /(root)**. La URL será parecida a `https://lourdeslozano.github.io/bimba-english/`.
