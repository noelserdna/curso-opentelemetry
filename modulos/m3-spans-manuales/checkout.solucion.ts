// Módulo 3 — Solución del reto.
// La traza mostraba que `aplicar-cupon` tardaba ~800 ms con BIENVENIDA10 y el atributo
// `cupon.comprobaciones = 40`: se consultaba la base de datos una vez por cada cupón.
// Solución: una única consulta por código. Solo cambia `aplicarCupon`.
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

// SOLUCIÓN: los cupones indexados por código.
const cupones = new Map<string, number>([
  ['VERANO5', 0.05],
  ...Array.from({ length: 38 }, (_, i) => [`CAMPANA${i + 1}`, 0.03] as [string, number]),
  ['BIENVENIDA10', 0.1],
]);

export class ErrorCheckout extends Error {
  constructor(
    mensaje: string,
    public readonly estadoHttp: number,
  ) {
    super(mensaje);
    this.name = 'ErrorCheckout';
  }
}

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

async function validarCarrito(carrito: Carrito): Promise<number> {
  return conSpan('validar-carrito', async (span) => {
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
    await esperar(20);

    span.setAttribute('carrito.subtotal', subtotal);
    return subtotal;
  });
}

async function aplicarCupon(subtotal: number, codigo?: string): Promise<number> {
  return conSpan('aplicar-cupon', async (span) => {
    if (!codigo) {
      span.setAttribute('cupon.aplicado', false);
      return subtotal;
    }
    span.setAttribute('cupon.codigo', codigo);

    // SOLUCIÓN: una sola consulta, tarde lo que tarde la lista de cupones.
    await esperar(20);
    const descuento = cupones.get(codigo) ?? 0;

    span.setAttribute('cupon.comprobaciones', 1);
    span.setAttribute('cupon.aplicado', descuento > 0);
    return subtotal * (1 - descuento);
  });
}

async function calcularImpuestos(base: number): Promise<number> {
  return conSpan('calcular-impuestos', async (span) => {
    const iva = base * 0.21;
    span.setAttribute('impuestos.iva', Number(iva.toFixed(2)));
    return base + iva;
  });
}

async function cobrar(total: number): Promise<string> {
  return conSpan('cobrar', async (span) => {
    span.setAttribute('pago.importe', Number(total.toFixed(2)));
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
