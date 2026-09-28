// Módulo 3 — Lógica de negocio del checkout, con spans manuales.
// La auto-instrumentación ve la petición HTTP, pero no sabe nada de tu negocio.
// Los spans manuales cuentan QUÉ hace tu código por dentro.
import { SpanStatusCode, trace, type Span } from '@opentelemetry/api';

const tracer = trace.getTracer('tienda.checkout');

const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export interface Item {
  productoId: number;
  cantidad: number;
}

export interface Carrito {
  items: Item[];
  cupon?: string;
}

const productos = [
  { id: 1, nombre: 'Teclado mecánico', precio: 89.9, stock: 12 },
  { id: 2, nombre: 'Ratón inalámbrico', precio: 34.5, stock: 40 },
  { id: 3, nombre: 'Monitor 27 pulgadas', precio: 249, stock: 5 },
];

// Cupones activos, tal y como los devuelve la "base de datos".
const cupones = [
  { codigo: 'VERANO5', descuento: 0.05 },
  ...Array.from({ length: 38 }, (_, i) => ({ codigo: `CAMPANA${i + 1}`, descuento: 0.03 })),
  { codigo: 'BIENVENIDA10', descuento: 0.1 },
];

// Error de negocio con el código HTTP que debe devolver la API.
export class ErrorCheckout extends Error {
  constructor(
    mensaje: string,
    public readonly estadoHttp: number,
  ) {
    super(mensaje);
    this.name = 'ErrorCheckout';
  }
}

// --- Paso 1: escrito "a mano" para ver todas las piezas de un span ---
async function validarCarrito(carrito: Carrito): Promise<number> {
  return tracer.startActiveSpan('validar-carrito', async (span) => {
    try {
      // Atributos: datos para buscar y filtrar trazas después.
      span.setAttribute('carrito.items', carrito.items.length);

      let subtotal = 0;
      for (const item of carrito.items) {
        const producto = productos.find((p) => p.id === item.productoId);
        if (!producto) {
          throw new ErrorCheckout(`El producto ${item.productoId} no existe`, 404);
        }
        if (producto.stock < item.cantidad) {
          throw new ErrorCheckout(`No hay stock suficiente de "${producto.nombre}"`, 409);
        }
        subtotal += producto.precio * item.cantidad;
      }
      await esperar(20); // consulta a la base de datos

      span.setAttribute('carrito.subtotal', subtotal);
      return subtotal;
    } catch (error) {
      // recordException guarda el error como evento del span…
      span.recordException(error as Error);
      // …pero solo setStatus lo marca como fallido (en rojo en Jaeger).
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      // Un span que no se cierra nunca se exporta.
      span.end();
    }
  });
}

// --- El mismo patrón, extraído a una función para no repetirlo ---
async function conSpan<T>(nombre: string, trabajo: (span: Span) => Promise<T>): Promise<T> {
  return tracer.startActiveSpan(nombre, async (span) => {
    try {
      return await trabajo(span);
    } catch (error) {
      span.recordException(error as Error);
      span.setStatus({ code: SpanStatusCode.ERROR, message: (error as Error).message });
      throw error;
    } finally {
      span.end();
    }
  });
}

// --- Paso 2 ---
async function aplicarCupon(subtotal: number, codigo?: string): Promise<number> {
  return conSpan('aplicar-cupon', async (span) => {
    if (!codigo) {
      span.setAttribute('cupon.aplicado', false);
      return subtotal;
    }
    span.setAttribute('cupon.codigo', codigo);

    let comprobaciones = 0;
    let descuento = 0;
    for (const cupon of cupones) {
      comprobaciones++;
      await esperar(20); // una consulta a la base de datos por cada cupón
      if (cupon.codigo === codigo) {
        descuento = cupon.descuento;
        break;
      }
    }

    span.setAttribute('cupon.comprobaciones', comprobaciones);
    span.setAttribute('cupon.aplicado', descuento > 0);
    return subtotal * (1 - descuento);
  });
}

// --- Paso 3 ---
async function calcularImpuestos(base: number): Promise<number> {
  return conSpan('calcular-impuestos', async (span) => {
    const iva = base * 0.21;
    span.setAttribute('impuestos.iva', Number(iva.toFixed(2)));
    return base + iva;
  });
}

// --- Paso 4 ---
async function cobrar(total: number): Promise<string> {
  return conSpan('cobrar', async (span) => {
    span.setAttribute('pago.importe', Number(total.toFixed(2)));
    // Eventos: momentos concretos dentro de un span, con su marca de tiempo.
    span.addEvent('pago.enviado-al-banco');
    await esperar(60);

    if (total > 1000) {
      throw new ErrorCheckout('Tarjeta rechazada: supera el límite de 1000 €', 402);
    }

    span.addEvent('pago.autorizado');
    return `PAGO-${Date.now()}`;
  });
}

export async function procesarCheckout(carrito: Carrito) {
  const subtotal = await validarCarrito(carrito);
  const conDescuento = await aplicarCupon(subtotal, carrito.cupon);
  const total = await calcularImpuestos(conDescuento);
  const referencia = await cobrar(total);
  return { referencia, total: Number(total.toFixed(2)) };
}
