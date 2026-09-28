// Módulo 5 — La tienda, ahora con métricas de negocio.
import express from 'express';
import { importePedido, pedidosCreados } from './metricas';
import { registrarMetricaDeStock } from './metricas.solucion';

const app = express();
app.use(express.json());

const productos = [
  { id: 1, nombre: 'Teclado mecánico', precio: 89.9, stock: 500 },
  { id: 2, nombre: 'Ratón inalámbrico', precio: 34.5, stock: 500 },
  { id: 3, nombre: 'Monitor 27 pulgadas', precio: 249, stock: 500 },
];

const metodosDePago = ['tarjeta', 'bizum', 'transferencia'];

// `npm run m5:solucion` añade la métrica del reto.
if (process.env.CURSO_SOLUCION) {
  registrarMetricaDeStock(productos);
}

app.post('/pedidos', (req, res) => {
  const { productoId, cantidad, metodoPago = 'tarjeta' } = req.body ?? {};
  const producto = productos.find((p) => p.id === Number(productoId));

  if (!producto) {
    res.status(404).json({ error: 'Producto no encontrado' });
    return;
  }
  if (!Number.isInteger(cantidad) || cantidad < 1 || !metodosDePago.includes(metodoPago)) {
    res.status(400).json({ error: 'Cantidad o método de pago no válidos' });
    return;
  }
  if (producto.stock < cantidad) {
    res.status(409).json({ error: 'No hay stock suficiente' });
    return;
  }

  producto.stock -= cantidad;
  const total = Number((producto.precio * cantidad).toFixed(2));

  // Los atributos de una métrica permiten desglosarla después ("pedidos por método de pago").
  // Pocos valores posibles: nunca un id de pedido ni un email.
  pedidosCreados.add(1, { 'pago.metodo': metodoPago });
  importePedido.record(total, { 'pago.metodo': metodoPago });

  res.status(201).json({ id: Date.now(), producto: producto.nombre, cantidad, total, metodoPago });
});

const puerto = Number(process.env.PORT ?? 8181);
app.listen(puerto, (error) => {
  if (error) {
    console.error(`No se pudo abrir el puerto ${puerto}: ${error.message}`);
    console.error('¿Tienes otro módulo del curso arrancado en otra terminal? Ciérralo con Ctrl+C.');
    process.exit(1);
  }
  console.log(`Tienda escuchando en http://localhost:${puerto}`);
});
