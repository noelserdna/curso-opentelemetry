// Módulo 4 — Configuración de OpenTelemetry, compartida por los dos servicios.
// Cambio respecto al módulo 3: ya no fijamos `serviceName` en el código.
// Cada proceso toma su nombre de la variable OTEL_SERVICE_NAME (env/pedidos.env
// y env/inventario.env), así el mismo archivo sirve para cualquier servicio.
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace';

const sdk = new NodeSDK({
  spanProcessors: [
    new BatchSpanProcessor({
      exporter: new OTLPTraceExporter(),
      scheduledDelayMillis: 1000,
    }),
  ],
  metricReaders: [],
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
