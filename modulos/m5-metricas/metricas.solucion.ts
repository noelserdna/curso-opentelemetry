// Módulo 5 — Solución del reto: una métrica propia con el stock de cada producto.
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('tienda');

interface Producto {
  nombre: string;
  stock: number;
}

// OBSERVABLE GAUGE: un valor que sube y baja y que no "ocurre", sino que "está".
// No lo actualizamos nosotros: el SDK nos pregunta el valor cada vez que exporta.
export function registrarMetricaDeStock(productos: Producto[]) {
  const stockDisponible = meter.createObservableGauge('tienda.stock.disponible', {
    description: 'Unidades disponibles de cada producto',
    unit: '{unidad}',
  });

  stockDisponible.addCallback((resultado) => {
    for (const producto of productos) {
      resultado.observe(producto.stock, { 'producto.nombre': producto.nombre });
    }
  });
}
