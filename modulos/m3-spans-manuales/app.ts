// Módulo 3 — API de checkout.
// La petición HTTP la instrumenta OpenTelemetry sola; el detalle del negocio
// lo añadimos nosotros en checkout.ts con spans manuales.
import express from 'express';
import * as original from './checkout';
import * as solucion from './checkout.solucion';

// `npm run m3:solucion` activa la versión corregida del reto.
const { procesarCheckout, ErrorCheckout } = process.env.CURSO_SOLUCION ? solucion : original;

const app = express();
app.use(express.json());

app.post('/checkout', async (req, res) => {
  const carrito = req.body ?? {};
  if (!Array.isArray(carrito.items) || carrito.items.length === 0) {
    res.status(400).json({ error: 'El carrito debe tener al menos un item' });
    return;
  }

  try {
    const resultado = await procesarCheckout(carrito);
    res.status(201).json(resultado);
  } catch (error) {
    if (error instanceof ErrorCheckout) {
      res.status(error.estadoHttp).json({ error: error.message });
      return;
    }
    res.status(500).json({ error: 'Error inesperado' });
  }
});

const puerto = Number(process.env.PORT ?? 8181);
app.listen(puerto, (error) => {
  if (error) {
    console.error(`No se pudo abrir el puerto ${puerto}: ${error.message}`);
    console.error('¿Tienes otro módulo del curso arrancado en otra terminal? Ciérralo con Ctrl+C.');
    process.exit(1);
  }
  console.log(`Checkout escuchando en http://localhost:${puerto}`);
});
