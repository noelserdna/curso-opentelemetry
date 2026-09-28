// Módulo 1 — Tu primer span.
// Un script sin servidor ni Docker: crea una traza y la imprime en la terminal.
import { trace } from '@opentelemetry/api';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace';

// 1. Configuramos el SDK: qué hacer con los spans cuando terminan.
const sdk = new NodeSDK({
  serviceName: 'tienda',
  // SimpleSpanProcessor exporta cada span en cuanto termina (ideal para aprender).
  spanProcessors: [new SimpleSpanProcessor({ exporter: new ConsoleSpanExporter() })],
  metricReaders: [],
  logRecordProcessors: [],
  autoDetectResources: false,
});
sdk.start();

// 2. Pedimos un tracer: la "fábrica" de spans de nuestro código.
const tracer = trace.getTracer('curso.m1');

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// 3. Cada función de negocio abre su span, trabaja y lo cierra.
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

async function prepararPedido() {
  // Span padre: todo lo que ocurra dentro queda colgado de él.
  await tracer.startActiveSpan('preparar-pedido', async (span) => {
    span.setAttribute('pedido.id', 1001);
    await validarStock();
    await calcularTotal();
    span.end();
  });
}

async function main() {
  await prepararPedido();
  // Sin shutdown(), un script corto puede terminar antes de exportar sus spans.
  await sdk.shutdown();
}

main();
