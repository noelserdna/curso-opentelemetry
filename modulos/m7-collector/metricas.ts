// Módulo 7 — Métricas de negocio (las mismas del módulo 5).
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('tienda');

export const pedidosCreados = meter.createCounter('tienda.pedidos.creados', {
  description: 'Número de pedidos creados',
  unit: '{pedido}',
});

export const importePedido = meter.createHistogram('tienda.pedido.importe', {
  description: 'Importe de cada pedido',
  unit: 'EUR',
  advice: {
    explicitBucketBoundaries: [10, 25, 50, 100, 250, 500, 1000],
  },
});
