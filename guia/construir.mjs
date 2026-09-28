// Convierte guia/index.html en una página web completa para GitHub Pages.
//
//   node guia/construir.mjs [carpeta-de-salida]     (por defecto, _site)
//
// guia/index.html es la única fuente de la guía. Está escrita sin <html>, <head> ni <body>,
// que es el formato en el que también se publica como artefacto. Este script le añade
// esas cabeceras; no cambia nada del contenido.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const salida = process.argv[2] ?? '_site';
const fuente = readFileSync(join(aqui, 'index.html'), 'utf8');

// La fuente empieza con <title>, las fuentes tipográficas y <style>: eso va en <head>.
const finEstilos = fuente.indexOf('</style>');
if (!fuente.trimStart().startsWith('<title>') || finEstilos < 0) {
  console.error('guia/index.html no tiene la forma esperada: debe empezar por <title> y contener un <style>.');
  process.exit(1);
}
const cabecera = fuente.slice(0, finEstilos + '</style>'.length).trim();
const cuerpo = fuente.slice(finEstilos + '</style>'.length).trim();

const descripcion =
  'Curso práctico de OpenTelemetry con Node.js y TypeScript: instrumenta una mini tienda y observa sus trazas, métricas y logs en Jaeger y Grafana.';

const pagina = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="description" content="${descripcion}">
<meta property="og:title" content="OpenTelemetry práctico">
<meta property="og:description" content="${descripcion}">
<meta property="og:type" content="website">
<link rel="icon" href="data:,">
<style>
  img { max-width: 100%; }
  [hidden] { display: none !important; }
</style>
${cabecera}
</head>
<body>
${cuerpo}
</body>
</html>
`;

mkdirSync(salida, { recursive: true });
writeFileSync(join(salida, 'index.html'), pagina);
console.log(`Guía construida en ${join(salida, 'index.html')} (${Math.round(pagina.length / 1024)} KB)`);
