// Módulo 1 — Solución del reto.
// Cambios respecto a main.ts: atributo `pedido.items` y un tercer span hijo.
import { trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace';

const sdk = new NodeSDK({
  serviceName: 'tienda',
  spanProcessors: [new SimpleSpanProcessor({ exporter: new ConsoleSpanExporter() })],
  metricReaders: [],
  logRecordProcessors: [],
  autoDetectResources: false,
});
sdk.start();

const tracer = trace.getTracer('curso.m1');

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function validarStock() {
  await tracer.startActiveSpan('validar-stock', async (span) => {
    await esperar(40);
    span.setAttribute('stock.disponible', true);
    span.end();
  });
}

async function calcularTotal() {
  await tracer.startActiveSpan('calcular-total', async (span) => {
    await esperar(15);
    span.setAttribute('pedido.total', 124.4);
    span.end();
  });
}

// RETO: tercer span hijo.
async function enviarConfirmacion() {
  await tracer.startActiveSpan('enviar-confirmacion', async (span) => {
    await esperar(25);
    span.setAttribute('notificacion.canal', 'email');
    span.end();
  });
}

async function prepararPedido() {
  await tracer.startActiveSpan('preparar-pedido', async (span) => {
    span.setAttribute('pedido.id', 1001);
    // RETO: nuevo atributo en el span padre.
    span.setAttribute('pedido.items', 2);
    await validarStock();
    await calcularTotal();
    await enviarConfirmacion();
    span.end();
  });
}

async function main() {
  await prepararPedido();
  await sdk.shutdown();
}

main();
