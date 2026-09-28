# OpenTelemetry práctico con Node.js y TypeScript

Curso en dos sesiones para programadores. Instrumentas una mini tienda paso a paso y ves sus
trazas, métricas y logs en herramientas reales: primero en la terminal, después en Jaeger, en
Grafana y, por último, detrás de tu propio Collector.

La explicación de cada módulo, con sus gráficos, está en la **guía del curso**: abre
`guia/index.html` en tu navegador. Este archivo es la chuleta de comandos.

```sh
git clone https://github.com/noelserdna/curso-opentelemetry.git
cd curso-opentelemetry
```

## Requisitos

| Necesitas | Versión | Para qué |
|---|---|---|
| Node.js | 22 o superior | Ejecutar las apps |
| Docker Desktop u OrbStack | Cualquiera reciente | Jaeger, Grafana y el Collector |
| 4 GB de RAM libres | — | Grafana LGTM es la imagen más pesada |

## Preparación (hazla antes de clase)

```sh
npm ci                                  # instala las versiones exactas del curso
docker compose --profile "*" pull       # descarga las tres imágenes (unos 2 GB)
npm run doctor                          # comprueba que todo está listo
```

`npm run doctor` debe terminar con «Todo listo». Si algo falla, te dice qué y cómo arreglarlo.

## La idea central

La app **siempre** envía su telemetría a `http://localhost:4318`. Lo único que cambia durante el
curso es quién escucha ahí. El código de la app no se toca al cambiar de herramienta.

| Etapa | Quién escucha en 4318 | Comando | Dónde mirar |
|---|---|---|---|
| Sesión 1 | Jaeger | `npm run infra:jaeger` | http://localhost:16686 |
| Sesión 2 | Grafana LGTM | `npm run infra:lgtm` | http://localhost:3000 |
| Sesión 2 | Tu Collector | `npm run infra:collector` | Las dos anteriores |

`npm run infra:down` lo para todo. Los datos se guardan en memoria: al cambiar de etapa se
empieza de cero.

## Sesión 1 — Fundamentos y trazas

| Módulo | Comando | Qué hace |
|---|---|---|
| M1 Primer span | `npm run m1` | Imprime una traza de 3 spans en la terminal |
| M2 Auto-instrumentación | `npm run m2:zero` | Tienda instrumentada sin código, solo variables de entorno |
| | `npm run m2:consola` | Igual, configurada en `instrumentation.ts` |
| | `npm run m2` | Envía las trazas a Jaeger |
| M3 Spans manuales | `npm run m3` | Checkout con una lentitud escondida |
| M4 Traza distribuida | `npm run m4:inventario` | Servicio de inventario (terminal 1) |
| | `npm run m4:pedidos` | Servicio de pedidos (terminal 2) |

## Sesión 2 — Métricas, logs y Collector

| Módulo | Comando | Qué hace |
|---|---|---|
| M5 Métricas | `npm run m5` | Contador e histograma de pedidos |
| M6 Logs | `npm run m6` | Logs con el `trace_id` de su petición |
| M7 Collector | `npm run m7` | La misma app, ahora detrás de tu Collector |
| M8 Sampling | `npm run m8` | La app de M7 registrando 1 de cada 4 trazas |

`npm run trafico` envía 60 pedidos a la tienda de los módulos 5 a 8 para que haya datos que
mirar. Con `npm run trafico -- 200` envía 200.

## Soluciones de los retos

| Reto | Comando | Archivo |
|---|---|---|
| M1 | `npm run m1:solucion` | `modulos/m1-primer-span/solucion.ts` |
| M3 | `npm run m3:solucion` | `modulos/m3-spans-manuales/checkout.solucion.ts` |
| M4 | `npm run m4:pedidos:solucion` | `modulos/m4-distribuida/pedidos.solucion.ts` |
| M5 | `npm run m5:solucion` | `modulos/m5-metricas/metricas.solucion.ts` |
| M7 | `npm run infra:collector:solucion` | `infra/otelcol.solucion.yaml` |
| M8 | `npm run infra:collector:tail` | `infra/otelcol.tail-sampling.yaml` |

## Puertos

| Puerto | Quién lo usa |
|---|---|
| 8181 | La tienda y el servicio de pedidos |
| 8182 | El servicio de inventario |
| 4318 / 4317 | Entrada de telemetría OTLP (HTTP / gRPC) |
| 16686 | Jaeger |
| 3000 | Grafana |

## No veo mis datos

1. **¿Está arrancada la infraestructura?** `docker ps` debe mostrar los contenedores `otel-curso-…`.
2. **¿La app dice que está escuchando?** Si el puerto está ocupado, cierra el otro módulo con Ctrl+C.
3. **¿Has hecho alguna petición?** Sin tráfico no hay telemetría. Usa `curl` o `npm run trafico`.
4. **¿Has esperado?** Jaeger muestra las trazas en un par de segundos. El buscador de trazas de
   Grafana tarda unos 30 segundos y las métricas se envían cada 5.
5. **¿Miras el rango de tiempo correcto?** En Grafana, elige «Last 15 minutes».
6. **¿Sigue sin funcionar?** `npm run doctor`.

## Estructura

```
modulos/    Un módulo por carpeta; cada uno es una foto completa y ejecutable
env/        Variables de entorno de cada modo de arranque
infra/      Configuración del Collector
scripts/    doctor, generador de tráfico y arranque de la infraestructura
guia/       Guía del curso
```
