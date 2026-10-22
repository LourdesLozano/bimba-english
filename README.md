# Bimba English

MVP web responsive/PWA para aprender inglés con un plan adaptativo, perfil por objetivos, vocabulario y contenido tipo series. La identidad visual usa un oso panda.

## Ejecutar

Abre `index.html` en un navegador o sirve esta carpeta con un servidor estático. Para instalarla en iPhone: abre la URL en Safari, pulsa **Compartir → Añadir a pantalla de inicio**.

## Estado actual

- Perfil con nombre, nivel, objetivos múltiples y contexto laboral.
- Lecciones, progreso, racha y vocabulario guardados en `localStorage`.
- Diseño responsive con navegación para móvil.
- Sección de escenas con diálogos propios tipo sitcom. Una app pública no debe copiar episodios o subtítulos de *Friends* sin licencia.

## Siguiente paso para sincronizar web + iPhone

El MVP guarda los datos localmente para poder probar la experiencia sin configurar credenciales. Para que el mismo perfil funcione en web y en iPhone, hay que conectar `save()` y la carga inicial a una base de datos con autenticación (por ejemplo Supabase o Firebase), con un `user_id` por perfil y sincronización de progreso. La interfaz ya separa el estado de la vista para hacer ese cambio sin rehacer las pantallas.
