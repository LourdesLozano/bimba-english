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
- Plan semanal inteligente que equilibra habilidades, nivel, objetivos, errores y lecciones pendientes.
- Corrección local ampliada para artículos de uso, preposiciones, comparativos, tiempos, concordancia, colocaciones y errores frecuentes de interferencia del español.
- Lecciones nuevas A1-C1 con práctica de speaking, writing, listening, vocabulario, gramática y pronunciación.
- Ejercicios de traducción, completar frases y ordenar palabras.
- Repaso espaciado de palabras guardadas y errores de ejercicios.
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

## Configurar Supabase

1. En Supabase abre **SQL Editor** y crea una consulta nueva.
2. Copia el contenido de [`supabase/schema.sql`](./supabase/schema.sql), pégalo y pulsa **Run**.
3. En **Authentication → Providers → Email**, deja habilitado Email.
4. En **Authentication → URL Configuration**, añade la URL publicada de GitHub Pages cuando la tengas.
5. Si ya ejecutaste una versión anterior del esquema, vuelve a ejecutar el archivo completo para crear el bucket privado `avatars` y sus políticas.

`supabase-config.js` solo contiene la URL del proyecto y la publishable key. Nunca pongas en el repositorio una contraseña de base de datos, `service_role` key o cadena de conexión directa.

La conversación y la pronunciación usan APIs del navegador: Safari puede pedir permiso para el micrófono y no todos los dispositivos ofrecen transcripción. La app muestra feedback orientativo, no una certificación fonética.

## Funciones que requieren infraestructura adicional

- Las notificaciones push sin pagar requieren generar claves VAPID, guardar solo la clave pública en `supabase-config.js`, desplegar una función Edge que lea `push_subscriptions` y programar su ejecución. La clave privada debe quedarse en los secrets de Supabase; nunca en este repositorio. Safari/iPhone exige instalar la web en la pantalla de inicio y aceptar el permiso desde esa PWA.
- La función preparada está en [`supabase/functions/send-reminders/index.ts`](./supabase/functions/send-reminders/index.ts). Para activarla hay que configurar `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` y `REMINDER_CRON_SECRET` como secrets, copiar la clave pública a `supabase-config.js` y ejecutar esa función con un programador seguro. La función usa la `service_role` únicamente en el servidor y nunca en el navegador.
- La corrección avanzada con IA requiere elegir un proveedor, definir límites de coste y decidir qué texto puede salir del dispositivo. La app mantiene ahora correcciones locales y no envía textos privados a terceros.

## Publicar

El proyecto es estático y puede publicarse con GitHub Pages. Activa **Settings → Pages → Deploy from a branch → main → /(root)**. La URL será parecida a `https://lourdeslozano.github.io/bimba-english/`.
