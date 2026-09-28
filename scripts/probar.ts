// Lanza las peticiones de prueba de cada módulo y muestra el resultado en una tabla.
// Es lo mismo que harías con curl, sin pelearte con las comillas del JSON.
//
//   npm run probar m2
//   npm run probar m3
//   npm run probar m4
//   npm run probar m6
const url = process.env.TIENDA_URL ?? 'http://localhost:8181';

interface Caso {
  nombre: string;
  metodo: 'GET' | 'POST';
  ruta: string;
  cuerpo?: unknown;
}

const casos: Record<string, Caso[]> = {
  m2: [
    { nombre: 'Lista de productos', metodo: 'GET', ruta: '/productos' },
    { nombre: 'Un producto', metodo: 'GET', ruta: '/productos/1' },
    { nombre: 'Producto que no existe', metodo: 'GET', ruta: '/productos/99' },
    { nombre: 'Crear un pedido', metodo: 'POST', ruta: '/pedidos', cuerpo: { productoId: 2, cantidad: 3 } },
  ],
  m3: [
    { nombre: 'Sin cupón', metodo: 'POST', ruta: '/checkout', cuerpo: { items: [{ productoId: 1, cantidad: 1 }] } },
    {
      nombre: 'Cupón VERANO5',
      metodo: 'POST',
      ruta: '/checkout',
      cuerpo: { items: [{ productoId: 1, cantidad: 1 }], cupon: 'VERANO5' },
    },
    {
      nombre: 'Cupón BIENVENIDA10',
      metodo: 'POST',
      ruta: '/checkout',
      cuerpo: { items: [{ productoId: 1, cantidad: 1 }], cupon: 'BIENVENIDA10' },
    },
    { nombre: 'Importe alto', metodo: 'POST', ruta: '/checkout', cuerpo: { items: [{ productoId: 3, cantidad: 5 }] } },
    { nombre: 'Producto que no existe', metodo: 'POST', ruta: '/checkout', cuerpo: { items: [{ productoId: 9, cantidad: 1 }] } },
  ],
  m4: [
    {
      nombre: 'Pedido de 3 productos',
      metodo: 'POST',
      ruta: '/pedidos',
      cuerpo: {
        items: [
          { productoId: 1, cantidad: 1 },
          { productoId: 2, cantidad: 2 },
          { productoId: 3, cantidad: 1 },
        ],
      },
    },
    { nombre: 'Pedido sin stock', metodo: 'POST', ruta: '/pedidos', cuerpo: { items: [{ productoId: 3, cantidad: 9 }] } },
  ],
  m6: [
    { nombre: 'Pedido con tarjeta', metodo: 'POST', ruta: '/pedidos', cuerpo: { productoId: 1, cantidad: 1, metodoPago: 'tarjeta' } },
    { nombre: 'Pedido por transferencia', metodo: 'POST', ruta: '/pedidos', cuerpo: { productoId: 2, cantidad: 2, metodoPago: 'transferencia' } },
    { nombre: 'Bizum de 747 €', metodo: 'POST', ruta: '/pedidos', cuerpo: { productoId: 3, cantidad: 3, metodoPago: 'bizum' } },
    { nombre: 'Producto que no existe', metodo: 'POST', ruta: '/pedidos', cuerpo: { productoId: 99, cantidad: 1 } },
  ],
};

async function main() {
  const modulo = process.argv[2];
  const lista = casos[modulo];
  if (!lista) {
    console.error(`Uso: npm run probar <${Object.keys(casos).join('|')}>`);
    console.error('Para los módulos 5 a 8 usa: npm run trafico');
    process.exit(1);
  }

  console.log(`\nPeticiones del módulo ${modulo.toUpperCase()} contra ${url}\n`);
  console.log(`${'Caso'.padEnd(26)}${'Petición'.padEnd(22)}${'HTTP'.padEnd(7)}Tiempo`);
  console.log('-'.repeat(64));

  for (const caso of lista) {
    const inicio = performance.now();
    let estado: string;
    try {
      const respuesta = await fetch(url + caso.ruta, {
        method: caso.metodo,
        headers: caso.cuerpo ? { 'content-type': 'application/json' } : undefined,
        body: caso.cuerpo ? JSON.stringify(caso.cuerpo) : undefined,
      });
      await respuesta.text();
      estado = String(respuesta.status);
    } catch {
      console.error(`\nNo se puede conectar con ${url}. ¿Está arrancado el módulo?`);
      process.exit(1);
    }
    const ms = Math.round(performance.now() - inicio);
    console.log(`${caso.nombre.padEnd(26)}${`${caso.metodo} ${caso.ruta}`.padEnd(22)}${estado.padEnd(7)}${ms} ms`);
  }
  console.log('');
}

main();
