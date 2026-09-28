// Módulo 7 — Configuración de OpenTelemetry.
// Es EXACTAMENTE la del módulo 6. La app sigue enviando OTLP a localhost:4318;
// lo que cambia es quién escucha ahí: ahora nuestro propio Collector.
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
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
      exportIntervalMillis: 5000,
    }),
  ],
  logRecordProcessors: [
    new BatchLogRecordProcessor({
      exporter: new OTLPLogExporter(),
      scheduledDelayMillis: 1000,
    }),
  ],
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
