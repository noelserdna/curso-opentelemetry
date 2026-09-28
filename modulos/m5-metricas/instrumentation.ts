// Módulo 5 — Configuración de OpenTelemetry: trazas + MÉTRICAS.
// Novedades respecto a la sesión 1:
//   1. Un Resource explícito: la "ficha" del servicio que acompaña a toda su telemetría.
//   2. Un lector de métricas que las exporta por OTLP cada 5 segundos.
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'tienda',
    [ATTR_SERVICE_VERSION]: '1.0.0',
  }),
  spanProcessors: [
    new BatchSpanProcessor({
      exporter: new OTLPTraceExporter(),
      scheduledDelayMillis: 1000,
    }),
  ],
  metricReaders: [
    new PeriodicExportingMetricReader({
      exporter: new OTLPMetricExporter(),
      // Por defecto exporta cada 60 s; en clase queremos ver los datos enseguida.
      exportIntervalMillis: 5000,
    }),
  ],
  // Los logs llegan en el módulo 6.
  logRecordProcessors: [],
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-net': { enabled: false },
      '@opentelemetry/instrumentation-dns': { enabled: false },
      '@opentelemetry/instrumentation-fs': { enabled: false },
      '@opentelemetry/instrumentation-router': { enabled: false },
    }),
  ],
});

sdk.start();

const cerrar = () => {
  sdk.shutdown().finally(() => process.exit(0));
};
process.on('SIGTERM', cerrar);
process.on('SIGINT', cerrar);
