// Arranca y para la infraestructura del curso (Jaeger, Grafana LGTM y Collector).
// Es un envoltorio fino sobre `docker compose`: puedes usar compose directamente si lo prefieres.
//
//   npm run infra:jaeger               Sesión 1 (M2-M4)
//   npm run infra:lgtm                 Sesión 2 (M5-M6)
//   npm run infra:collector            Sesión 2 (M7-M8)
//   npm run infra:collector:solucion   Collector con la solución del reto de M7
//   npm run infra:collector:tail       Collector con tail sampling (M8)
//   npm run infra:down                 Parar todo
import { spawnSync } from 'node:child_process';
import { existsSync, realpathSync } from 'node:fs';
import { join } from 'node:path';

// Ruta real del proyecto, con sus mayúsculas exactas. En macOS puedes entrar en una
// carpeta escribiendo su nombre en minúsculas, pero Docker monta los archivos dentro
// de Linux, que sí distingue mayúsculas, y no encontraría la configuración.
const raiz = realpathSync.native(join(__dirname, '..'));

const etapas: Record<string, { perfil: string; urls: string[] }> = {
  jaeger: {
    perfil: 'jaeger',
    urls: ['Jaeger   http://localhost:16686'],
  },
  lgtm: {
    perfil: 'lgtm',
    urls: ['Grafana  http://localhost:3000'],
  },
  collector: {
    perfil: 'collector',
    urls: ['Jaeger   http://localhost:16686', 'Grafana  http://localhost:3000'],
  },
};

function compose(args: string[], entorno: Record<string, string> = {}) {
  const resultado = spawnSync('docker', ['compose', '--project-directory', raiz, ...args], {
    cwd: raiz,
    stdio: 'inherit',
    env: { ...process.env, PWD: raiz, ...entorno },
  });
  return resultado.status ?? 1;
}

function comprobarDocker() {
  const resultado = spawnSync('docker', ['info'], { stdio: 'ignore' });
  if (resultado.status !== 0) {
    console.error('Docker no responde. Abre Docker Desktop (u OrbStack), espera a que arranque y repite el comando.');
    process.exit(1);
  }
}

function parar() {
  return compose(['--profile', '*', 'down', '--remove-orphans']);
}

function arrancar(nombre: string, variante?: string) {
  const etapa = etapas[nombre];
  const entorno: Record<string, string> = {};

  if (variante) {
    const config = `otelcol.${variante}.yaml`;
    if (nombre !== 'collector' || !existsSync(join(raiz, 'infra', config))) {
      console.error(`No existe la configuración "${variante}". Opciones: solucion, tail-sampling.`);
      process.exit(1);
    }
    entorno.OTELCOL_CONFIG = config;
  }

  // Todas las etapas escuchan en los mismos puertos: primero se para lo que hubiera.
  parar();
  console.log('\nArrancando. Grafana tarda alrededor de un minuto la primera vez…');
  const estado = compose(['--profile', etapa.perfil, 'up', '-d', '--wait'], entorno);
  if (estado !== 0) {
    console.error('\nNo se pudo arrancar. Revisa el error de arriba; lo más habitual es un puerto ocupado (3000, 4317, 4318 o 16686).');
    process.exit(estado);
  }

  console.log('\nListo. La app debe enviar la telemetría a http://localhost:4318');
  for (const url of etapa.urls) console.log(`  ${url}`);
  if (variante) console.log(`  Collector con la configuración infra/otelcol.${variante}.yaml`);
}

const [orden, variante] = process.argv.slice(2);

comprobarDocker();

if (orden === 'down') {
  process.exit(parar());
} else if (orden === 'reiniciar-collector') {
  // Aplica los cambios que hayas hecho en infra/otelcol.yaml.
  process.exit(compose(['--profile', 'collector', 'restart', 'collector']));
} else if (orden === 'logs-collector') {
  process.exit(compose(['--profile', 'collector', 'logs', '-f', '--tail', '40', 'collector']));
} else if (orden in etapas) {
  arrancar(orden, variante);
} else {
  console.error('Uso: tsx scripts/infra.ts <jaeger|lgtm|collector|down|reiniciar-collector|logs-collector> [solucion|tail-sampling]');
  process.exit(1);
}
