# Filmoteca en el móvil

La versión instalable utiliza LAB y los mismos datos publicados. Las actualizaciones del catálogo se reciben al abrirla con conexión. Las películas se abren mediante sus referencias de Telegram.

## iPhone y iPad

1. Abrir https://pepepresley.github.io/filmoteca-pepe-presley/lab/ en Safari.
2. Pulsar Compartir y elegir **Añadir a pantalla de inicio**.
3. Si aparece, activar **Abrir como app web** y pulsar **Añadir**.

Si el enlace se abrió dentro de otra aplicación, abrirlo primero en Safari. El botón **Instalar Filmoteca** de la portada muestra estas instrucciones. Una vez instalada, abrir desde su icono.

Referencia: [guía de Apple](https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios).

## Android

Abrir LAB en Chrome o Edge y pulsar **Instalar Filmoteca**. Si el navegador no ofrece el diálogo de instalación, usar su menú **Instalar aplicación** o **Añadir a pantalla de inicio**.

## Mantenimiento

`app/manifest.webmanifest` define nombre, iconos, ámbito del proyecto y apertura en LAB. LAB y Lite comparten la instalación: el icono inicia LAB. Los enlaces de navegación al resto del proyecto permanecen dentro del ámbito de la app. No se guardan catálogos ni vídeos para uso sin conexión.

Al cambiar `app/install.js` o `app/install.css`, incrementar su versión en las dos páginas. Mantener las referencias relativas al subdirectorio del proyecto en GitHub Pages. Iconos PNG: 180 para Apple; 192 y 512 para el manifest.

Referencia técnica: [instalación de aplicaciones web, MDN](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).
