// Módulo 4 — Servicio de inventario (puerto 8182).
// Es un servicio independiente: otro proceso, otro puerto, otro `service.name`.
import express from 'express';

const app = express();

const stock = new Map<number, number>([
  [1, 12],
  [2, 40],
  [3, 5],
]);

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Imprime la cabecera con la que viaja el contexto de la traza entre servicios.
// Formato W3C: version-traceId-spanIdDelPadre-flags
app.use(function mostrarTraceparent(req, _res, next) {
  console.log(`${req.method} ${req.url}  traceparent: ${req.headers.traceparent ?? '(sin cabecera)'}`);
  next();
});

// Stock de varios productos en una sola petición: /stock?ids=1,2,3
app.get('/stock', async (req, res) => {
  const ids = String(req.query.ids ?? '')
    .split(',')
    .map(Number)
    .filter((id) => Number.isInteger(id) && id > 0);
  await esperar(40); // una sola consulta a la base de datos
  res.json(ids.map((id) => ({ productoId: id, disponible: stock.get(id) ?? 0 })));
});

// Stock de un único producto.
app.get('/stock/:productoId', async (req, res) => {
  const productoId = Number(req.params.productoId);
  await esperar(40); // consulta a la base de datos
  res.json({ productoId, disponible: stock.get(productoId) ?? 0 });
});

const puerto = Number(process.env.PORT ?? 8182);
app.listen(puerto, (error) => {
  if (error) {
    console.error(`No se pudo abrir el puerto ${puerto}: ${error.message}`);
    console.error('¿Tienes otro módulo del curso arrancado en otra terminal? Ciérralo con Ctrl+C.');
    process.exit(1);
  }
  console.log(`Inventario escuchando en http://localhost:${puerto}`);
});
