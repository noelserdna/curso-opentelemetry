// Módulo 4 — Servicio de pedidos (puerto 8181).
// Para crear un pedido pregunta el stock al servicio de inventario por HTTP.
// No hay código de propagación: `fetch` está auto-instrumentado y añade
// la cabecera `traceparent` a cada llamada saliente.
import express from 'express';
import { trace } from '@opentelemetry/api';

const tracer = trace.getTracer('tienda.pedidos');
const INVENTARIO_URL = process.env.INVENTARIO_URL ?? 'http://localhost:8182';

interface Item {
  productoId: number;
  cantidad: number;
}

const app = express();
app.use(express.json());

async function comprobarStock(items: Item[]): Promise<Item[]> {
  return tracer.startActiveSpan('comprobar-stock', async (span) => {
    try {
      span.setAttribute('pedido.items', items.length);

      const sinStock: Item[] = [];
      // Una llamada al inventario por cada producto del pedido.
      for (const item of items) {
        const respuesta = await fetch(`${INVENTARIO_URL}/stock/${item.productoId}`);
        const { disponible } = (await respuesta.json()) as { disponible: number };
        if (disponible < item.cantidad) {
          sinStock.push(item);
        }
      }

      span.setAttribute('pedido.items_sin_stock', sinStock.length);
      return sinStock;
    } finally {
      span.end();
    }
  });
}

app.post('/pedidos', async (req, res) => {
  const items: Item[] = req.body?.items ?? [];
  if (!Array.isArray(items) || items.length === 0) {
    res.status(400).json({ error: 'El pedido debe tener al menos un item' });
    return;
  }

  try {
    const sinStock = await comprobarStock(items);
    if (sinStock.length > 0) {
      res.status(409).json({ error: 'No hay stock suficiente', sinStock });
      return;
    }
    res.status(201).json({ id: Date.now(), items });
  } catch {
    res.status(502).json({ error: 'El servicio de inventario no responde' });
  }
});

const puerto = Number(process.env.PORT ?? 8181);
app.listen(puerto, (error) => {
  if (error) {
    console.error(`No se pudo abrir el puerto ${puerto}: ${error.message}`);
    console.error('¿Tienes otro módulo del curso arrancado en otra terminal? Ciérralo con Ctrl+C.');
    process.exit(1);
  }
  console.log(`Pedidos escuchando en http://localhost:${puerto}`);
});
