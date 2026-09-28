// Módulo 3 — Configuración de OpenTelemetry (igual que en el módulo 2).
// Este archivo se carga ANTES que la app gracias a `--import`.
// Así, cuando la app hace `import express`, la librería ya está instrumentada.
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace';

// CURSO_EXPORTADOR=consola imprime los spans en la terminal.
// Sin esa variable, se envían por OTLP a http://localhost:4318 (Jaeger).
const aConsola = process.env.CURSO_EXPORTADOR === 'consola';

const sdk = new NodeSDK({
  serviceName: 'tienda',
  spanProcessors: [
    aConsola
      ? new SimpleSpanProcessor({ exporter: new ConsoleSpanExporter() })
      : new BatchSpanProcessor({
          exporter: new OTLPTraceExporter(),
          // Por defecto espera 5 s antes de enviar; en clase queremos verlo enseguida.
          scheduledDelayMillis: 1000,
        }),
  ],
  // En esta sesión solo trabajamos con trazas. Si no vaciamos estas dos listas,
  // el SDK intenta enviar métricas y logs, y Jaeger (solo trazas) devuelve errores.
  metricReaders: [],
  logRecordProcessors: [],
  instrumentations: [
    getNodeAutoInstrumentations({
      // Spans de muy bajo nivel que solo añaden ruido en un curso.
      '@opentelemetry/instrumentation-net': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-fs': { enabled: false },
      // Express 5 usa internamente el paquete `router`: con `express` ya lo vemos todo.
      '@opentelemetry/instrumentation-router': { enabled: false },
    }),
  ],
});

sdk.start();

// Al cerrar con Ctrl+C, enviamos los spans que queden en memoria.
const cerrar = () => {
  sdk.shutdown().finally(() => process.exit(0));
};
process.on('SIGTERM', cerrar);
process.on('SIGINT', cerrar);
