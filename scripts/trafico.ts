// Genera tráfico contra la tienda para que haya datos que mirar.
//
//   npm run trafico                    60 pedidos a /pedidos (módulos 5 a 8)
//   npm run trafico -- 200             200 pedidos
//   npm run trafico -- 20 --sin-pausa  20 pedidos seguidos, sin esperar entre ellos
const total = Number(process.argv.slice(2).find((a) => /^\d+$/.test(a)) ?? 60);
const sinPausa = process.argv.includes('--sin-pausa');
const url = process.env.TIENDA_URL ?? 'http://localhost:8181';

const metodos = ['tarjeta', 'tarjeta', 'tarjeta', 'bizum', 'bizum', 'transferencia'];
const emails = ['ana@example.com', 'luis@example.com', 'marta@example.com'];

const alAzar = <T>(lista: T[]): T => lista[Math.floor(Math.random() * lista.length)];
const esperar = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const resultados = new Map<number, number>();

  for (let i = 1; i <= total; i++) {
    let pedido = {
      productoId: alAzar([1, 2, 3]),
      cantidad: alAzar([1, 1, 2, 3]),
      metodoPago: alAzar(metodos),
      email: alAzar(emails),
    };
    // Errores garantizados, para que siempre haya algo que investigar:
    if (i % 10 === 0) {
      // uno de cada diez pide un producto que no existe (404)…
      pedido = { ...pedido, productoId: 99 };
    } else if (i % 8 === 0) {
      // …y uno de cada ocho paga 747 € por Bizum, que no admite más de 500 € (402).
      pedido = { ...pedido, productoId: 3, cantidad: 3, metodoPago: 'bizum' };
    }

    try {
      const respuesta = await fetch(`${url}/pedidos`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(pedido),
      });
      resultados.set(respuesta.status, (resultados.get(respuesta.status) ?? 0) + 1);
    } catch {
      console.error(`No se puede conectar con ${url}. ¿Está arrancada la tienda?`);
      process.exit(1);
    }

    if (!sinPausa) await esperar(100);
  }

  console.log(`${total} peticiones enviadas a ${url}/pedidos`);
  for (const [estado, veces] of [...resultados].sort()) {
    console.log(`  HTTP ${estado}: ${veces}`);
  }
}

main();
