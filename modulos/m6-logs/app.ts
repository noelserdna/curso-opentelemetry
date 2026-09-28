// Módulo 6 — La tienda, ahora con logs.
// Cada log escrito mientras se atiende una petición lleva el trace_id de esa petición:
// es el hilo del que tirar para pasar de "hay un error en el log" a "esto es lo que ocurrió".
import express from 'express';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import { logger } from './logger';
import { importePedido, pedidosCreados } from './metricas';

const tracer = trace.getTracer('tienda');

const app = express();
app.use(express.json());

const productos = [
  { id: 1, nombre: 'Teclado mecánico', precio: 89.9, stock: 500 },
  { id: 2, nombre: 'Ratón inalámbrico', precio: 34.5, stock: 500 },
  { id: 3, nombre: 'Monitor 27 pulgadas', precio: 249, stock: 500 },
];

const metodosDePago = ['tarjeta', 'bizum', 'transferencia'];
const LIMITE_BIZUM = 500;

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function cobrar(total: number, metodoPago: string) {
  await tracer.startActiveSpan('cobrar', async (span) => {
    try {
      span.setAttribute('pago.metodo', metodoPago);
      span.setAttribute('pago.importe', total);
      // Las transferencias tardan más: hay que consultar al banco.
      await esperar(metodoPago === 'transferencia' ? 300 : 40);
      if (metodoPago === 'bizum' && total > LIMITE_BIZUM) {
        throw new Error(`Bizum no admite pagos de más de ${LIMITE_BIZUM} €`);
      }
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  });
}

app.post('/pedidos', async (req, res) => {
  const { productoId, cantidad, metodoPago = 'tarjeta' } = req.body ?? {};
  const producto = productos.find((p) => p.id === Number(productoId));

  if (!producto) {
    logger.warn({ productoId }, 'Pedido rechazado: el producto no existe');
    res.status(404).json({ error: 'Producto no encontrado' });
    return;
  }
  if (!Number.isInteger(cantidad) || cantidad < 1 || !metodosDePago.includes(metodoPago)) {
    logger.warn({ cantidad, metodoPago }, 'Pedido rechazado: datos no válidos');
    res.status(400).json({ error: 'Cantidad o método de pago no válidos' });
    return;
  }

  const total = Number((producto.precio * cantidad).toFixed(2));

  try {
    await cobrar(total, metodoPago);
  } catch (error) {
    logger.error({ err: error, total, metodoPago }, 'Pago rechazado');
    res.status(402).json({ error: (error as Error).message });
    return;
  }

  producto.stock -= cantidad;
  pedidosCreados.add(1, { 'pago.metodo': metodoPago });
  importePedido.record(total, { 'pago.metodo': metodoPago });

  logger.info({ producto: producto.nombre, cantidad, total, metodoPago }, 'Pedido creado');
  res.status(201).json({ id: Date.now(), producto: producto.nombre, cantidad, total, metodoPago });
});

const puerto = Number(process.env.PORT ?? 8181);
app.listen(puerto, (error) => {
  if (error) {
    console.error(`No se pudo abrir el puerto ${puerto}: ${error.message}`);
    console.error('¿Tienes otro módulo del curso arrancado en otra terminal? Ciérralo con Ctrl+C.');
    process.exit(1);
  }
  logger.info({ puerto }, 'Tienda escuchando');
});
