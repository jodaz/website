---
title: "Un viewport, dos idiomas, cero i18n en el cliente"
description: "Por qué este sitio traduce en tiempo de compilación, cómo funciona la redirección de idioma en la primera visita y cuánto cuesta mantener dos páginas sincronizadas."
publishDate: 2026-10-25
tags: ["astro", "i18n"]
lang: "es"
draft: false
---

Este sitio es una sola página. Tiene que funcionar en inglés y en español, cargar rápido y seguir siendo lo bastante simple como para mantenerlo entre proyectos de clientes. La solución obvia es i18next con un detector de idioma en React. A propósito, no envié eso al navegador.

Las dependencias siguen en `package.json`: `i18next`, `react-i18next`, `i18next-browser-languagedetector` e `i18next-http-backend`. Son restos de la versión anterior del sitio, cuando tenía varias páginas. Nada en `src/` las importa en tiempo de ejecución. Siempre tengo pendiente eliminarlas, pero lo importante es que nunca formaron parte del diseño actual.

## La traducción ocurre en tiempo de compilación

`src/lib/i18n.ts` importa los dos archivos de locale directamente:

```ts
import en from '../../public/locales/en/common.json';
import es from '../../public/locales/es/common.json';

const translations = { en, es } as const;
export type Lang = 'en' | 'es';
```

`useTranslations(lang)` devuelve una función `t()` que recorre una ruta con puntos dentro del objeto del idioma elegido. Si la clave no existe, recorre la misma ruta en el archivo inglés. Si tampoco está ahí, devuelve la clave tal cual. Ese último detalle es el que más uso: un error de escritura no rompe la compilación ni deja un espacio vacío. En la página aparece `hero.ctaPrimary`, y eso no pasa desapercibido.

El costo es que `t()` solo busca y aplica el fallback. No interpola ni pluraliza. Para el blog, la etiqueta de tiempo de lectura es una plantilla con un marcador `{n}` que el componente reemplaza antes de renderizar. Para este sitio alcanza. Si algún día el texto necesita reglas de plural reales, agregaré un formateador pequeño en lugar de volver a meter una librería en tiempo de ejecución.

Como la traducción se resuelve durante la compilación, el navegador descarga dos documentos HTML estáticos: uno en `/` y otro en `/es`. No hay un paquete de idioma, ni una petición de JSON, ni un parpadeo del idioma equivocado después de la hidratación. Los islands de React solo reciben cadenas ya resueltas como props. La página principal le pasa al island el nombre, el rol, la biografía, el texto alternativo de la foto y las etiquetas de las pestañas; el island nunca llama a `t()`.

## Elegir el idioma

El sitio maneja dos ideas distintas de preferencia de idioma. La URL decide qué se renderiza. `localStorage` recuerda qué eligió el visitante, para que la próxima visita coincida con su última decisión y no con la configuración de su navegador.

En una primera visita, cuando no hay preferencia guardada, `LanguageDetector.astro` ejecuta un script inline pequeño en el head. Lee `navigator.language` y redirige a la página en español si el navegador empieza con `es`. Solo lo hace en la página principal:

```ts
if (storedPref === 'en' || storedPref === 'es') {
  targetLang = storedPref;
} else if (isHomePage) {
  const browserLang = navigator.language || navigator.userLanguage || 'en';
  targetLang = browserLang.startsWith('es') ? 'es' : 'en';
  localStorage.setItem(PREFERRED_LANG_KEY, targetLang);
}
```

La condición importa. Quien llega a una página profunda desde un resultado de búsqueda debe recibir el idioma de esa URL, no una redirección basada en la configuración de su navegador. Detectar el idioma en todas las páginas rompería la indexación y haría poco confiables los enlaces compartidos. En la página principal es un valor por defecto razonable; en el resto, manda la URL.

El botón de idioma del header escribe la misma clave `preferred_lang` en `localStorage` antes de seguir el enlace al otro idioma. También borra la marca `lang_redirected` de `sessionStorage`, para que el detector no pelee con la elección manual durante la misma sesión.

## URLs canónicas sin barra final

La convención de URLs públicas es sin barra final: la página principal en inglés es `https://jodaz.vanguarddevs.com` y la española es `/es`. `astro.config.mjs` lo impone:

```js
i18n: {
  defaultLocale: 'en',
  locales: ['en', 'es'],
  routing: {
    prefixDefaultLocale: false,
  },
},
trailingSlash: 'never',
```

`BaseHead` construye la URL canónica a partir de `Astro.url.pathname` y quita cualquier barra final, porque `new URL('/', site)` siempre serializa la raíz como `/`. Ese mismo componente emite los enlaces `hreflang`. Una página solo anuncia una traducción cuando realmente existe: las páginas principales pasan `alternateUrl`, y una entrada del blog lo pasa únicamente cuando `getTranslation()` encuentra una contraparte con el mismo slug en el otro idioma. Si no hay contraparte, la página emite su propio `hreflang` y un `x-default` que apunta a sí misma, en lugar de fingir que existe una versión en inglés o en español.

## Lo que cuesta la duplicación

Las dos páginas principales son casi idénticas. `src/pages/index.astro` y `src/pages/es/index.astro` importan el mismo island y le pasan la misma forma de props, pero cada una resuelve sus propias cadenas y declara su propio `lang`. Cada cambio de texto es una edición en dos archivos. Ese es el precio de traducir en tiempo de compilación sin una abstracción de rutas.

Para una sola landing, me parece un buen intercambio. No hay maquinaria oculta que depurar, la salida es HTML plano y el idioma de una página se ve en su ruta. El blog sigue la misma regla a menor escala: cada entrada declara su `lang` en el frontmatter y el generador de páginas pide las entradas que coinciden. Si el sitio crece a docenas de páginas con navegación compartida y texto dinámico, la duplicación dejará de ser barata y revisaré la decisión. Por ahora, todo el sistema de traducción es un archivo pequeño y dos objetos JSON.
