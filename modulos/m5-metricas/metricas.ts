// Módulo 5 — Métricas de negocio de la tienda.
// Una traza cuenta la historia de UNA petición. Una métrica resume TODAS:
// cuántos pedidos, de qué importe, con qué método de pago.
import { metrics } from '@opentelemetry/api';

// El meter es a las métricas lo que el tracer a los spans.
const meter = metrics.getMeter('tienda');

// COUNTER: un número que solo sube. Responde a "¿cuántos…?".
export const pedidosCreados = meter.createCounter('tienda.pedidos.creados', {
  description: 'Número de pedidos creados',
  unit: '{pedido}',
});

// HISTOGRAM: reparte los valores en tramos. Responde a "¿cómo se distribuye…?".
export const importePedido = meter.createHistogram('tienda.pedido.importe', {
  description: 'Importe de cada pedido',
  unit: 'EUR',
  advice: {
    // Tramos pensados para importes en euros (los de por defecto son para milisegundos).
    explicitBucketBoundaries: [10, 25, 50, 100, 250, 500, 1000],
  },
});
