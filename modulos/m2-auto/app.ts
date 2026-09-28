// Módulo 2 — La API de la mini tienda.
// Fíjate: en este archivo NO hay ni una línea de OpenTelemetry.
// Toda la telemetría la añade la auto-instrumentación desde fuera.
import express from 'express';

const app = express();
app.use(express.json());

const productos = [
  { id: 1, nombre: 'Teclado mecánico', precio: 89.9, stock: 12 },
  { id: 2, nombre: 'Ratón inalámbrico', precio: 34.5, stock: 40 },
  { id: 3, nombre: 'Monitor 27 pulgadas', precio: 249, stock: 5 },
];

const pedidos: { id: number; productoId: number; cantidad: number; total: number }[] = [];

app.get('/productos', (_req, res) => {
  res.json(productos);
});

app.get('/productos/:id', (req, res) => {
  const producto = productos.find((p) => p.id === Number(req.params.id));
  if (!producto) {
    res.status(404).json({ error: 'Producto no encontrado' });
    return;
  }
  res.json(producto);
});

app.post('/pedidos', (req, res) => {
  const { productoId, cantidad } = req.body ?? {};
  const producto = productos.find((p) => p.id === Number(productoId));
  if (!producto) {
    res.status(404).json({ error: 'Producto no encontrado' });
    return;
  }
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    res.status(400).json({ error: 'La cantidad debe ser un entero mayor que 0' });
    return;
  }
  const pedido = {
    id: pedidos.length + 1,
    productoId: producto.id,
    cantidad,
    total: Number((producto.precio * cantidad).toFixed(2)),
  };
  pedidos.push(pedido);
  res.status(201).json(pedido);
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
