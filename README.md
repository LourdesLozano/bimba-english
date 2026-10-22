# Bimba English

MVP web responsive/PWA para aprender inglés con un plan adaptativo, perfil por objetivos, vocabulario y contenido tipo series. La identidad visual usa un oso panda.

## Ejecutar

Abre `index.html` en un navegador o sirve esta carpeta con un servidor estático. Para instalarla en iPhone: abre la URL en Safari, pulsa **Compartir → Añadir a pantalla de inicio**.

## Estado actual

- Perfil con nombre, nivel, objetivos múltiples y contexto laboral.
- Lecciones, progreso, racha y vocabulario guardados en `localStorage` como respaldo.
- Diseño responsive con navegación para móvil.
- Sección de escenas con diálogos propios tipo sitcom. Una app pública no debe copiar episodios o subtítulos de *Friends* sin licencia.
- Catálogo de 1.400+ entradas de vocabulario para A1-C1, con filtros por nivel y categoría gramatical.
- Ejercicios de traducción, completar frases y ordenar palabras.
- Repaso espaciado de palabras guardadas y errores de ejercicios.
- Lecciones de gramática que enlazan sus frases con palabras del catálogo.
- Diagnóstico ampliado de 12 preguntas con dimensiones de gramática, vocabulario, escritura, escucha y pronunciación.
- Registro e inicio de sesión con Supabase.
- Sincronización del progreso por usuario entre dispositivos.
- Políticas RLS para que cada usuario solo pueda leer y modificar sus propios datos.

## Configurar Supabase

1. En Supabase abre **SQL Editor** y crea una consulta nueva.
2. Copia el contenido de [`supabase/schema.sql`](./supabase/schema.sql), pégalo y pulsa **Run**.
3. En **Authentication → Providers → Email**, deja habilitado Email.
4. En **Authentication → URL Configuration**, añade la URL publicada de GitHub Pages cuando la tengas.

`supabase-config.js` solo contiene la URL del proyecto y la publishable key. Nunca pongas en el repositorio una contraseña de base de datos, `service_role` key o cadena de conexión directa.

## Publicar

El proyecto es estático y puede publicarse con GitHub Pages. Activa **Settings → Pages → Deploy from a branch → main → /(root)**. La URL será parecida a `https://lourdeslozano.github.io/bimba-english/`.
