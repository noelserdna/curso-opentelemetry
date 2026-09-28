// Comprueba que tu equipo está listo para el curso.
//
//   npm run doctor
//
// Revisa Node, las dependencias, Docker, las imágenes, los puertos y, lo más importante,
// que la auto-instrumentación engancha de verdad en tu máquina.
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { existsSync, readFileSync, realpathSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';

const raiz = realpathSync.native(join(__dirname, '..'));

const IMAGENES = [
  'jaegertracing/jaeger:2.21.0',
  'grafana/otel-lgtm:0.34.0',
  'otel/opentelemetry-collector-contrib:0.161.0',
];

const PUERTOS_APPS = [8181, 8182];
const PUERTOS_INFRA = [4317, 4318, 16686, 3000];

let fallos = 0;
let avisos = 0;

const ok = (texto: string) => console.log(`  [ OK ]  ${texto}`);
const aviso = (texto: string, ayuda: string) => {
  avisos++;
  console.log(`  [AVISO] ${texto}\n          ${ayuda}`);
};
const fallo = (texto: string, ayuda: string) => {
  fallos++;
  console.log(`  [FALLO] ${texto}\n          ${ayuda}`);
};

function puertoLibre(puerto: number): Promise<boolean> {
  return new Promise((resolve) => {
    const servidor = createServer();
    servidor.once('error', () => resolve(false));
    servidor.once('listening', () => servidor.close(() => resolve(true)));
    servidor.listen(puerto);
  });
}

function puertoAlAzar(): Promise<number> {
  return new Promise((resolve) => {
    const servidor = createServer();
    servidor.listen(0, () => {
      const direccion = servidor.address();
      const puerto = typeof direccion === 'object' && direccion ? direccion.port : 0;
      servidor.close(() => resolve(puerto));
    });
  });
}

// tsx lanza la app en un proceso hijo propio: hay que cerrar el árbol entero, no solo el lanzador.
function cerrarArbol(hijo: ChildProcess) {
  if (!hijo.pid) return;
  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(hijo.pid), '/T', '/F'], { stdio: 'ignore' });
    return;
  }
  try {
    process.kill(-hijo.pid, 'SIGKILL');
  } catch {
    hijo.kill('SIGKILL');
  }
}

function comprobarNode() {
  const mayor = Number(process.versions.node.split('.')[0]);
  if (mayor >= 22) ok(`Node.js ${process.versions.node}`);
  else fallo(`Node.js ${process.versions.node}`, 'El curso necesita Node 22 o superior: https://nodejs.org');
}

function comprobarDependencias() {
  const paquete = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8'));
  const distintas: string[] = [];
  for (const [nombre, esperada] of Object.entries<string>(paquete.dependencies)) {
    const ruta = join(raiz, 'node_modules', nombre, 'package.json');
    if (!existsSync(ruta)) {
      fallo('Faltan dependencias', 'Ejecuta `npm ci` en la carpeta del curso.');
      return;
    }
    const instalada = JSON.parse(readFileSync(ruta, 'utf8')).version;
    if (instalada !== esperada) distintas.push(`${nombre} ${instalada} (se esperaba ${esperada})`);
  }
  if (distintas.length > 0) {
    fallo(`Versiones distintas a las del curso: ${distintas.join(', ')}`, 'Ejecuta `npm ci` para instalar las versiones exactas.');
    return;
  }
  ok(`Dependencias instaladas (OpenTelemetry SDK ${paquete.dependencies['@opentelemetry/sdk-node']})`);
}

function comprobarDocker(): boolean {
  const info = spawnSync('docker', ['info', '--format', '{{.ServerVersion}}'], { encoding: 'utf8' });
  if (info.status !== 0) {
    fallo('Docker no responde', 'Abre Docker Desktop (u OrbStack) y espera a que arranque. Solo el módulo 1 funciona sin Docker.');
    return false;
  }
  ok(`Docker ${info.stdout.trim()}`);

  const faltan = IMAGENES.filter(
    (imagen) => spawnSync('docker', ['image', 'inspect', imagen], { stdio: 'ignore' }).status !== 0,
  );
  if (faltan.length > 0) {
    aviso(
      `Imágenes sin descargar: ${faltan.join(', ')}`,
      'Descárgalas antes de clase: docker compose --profile "*" pull',
    );
  } else {
    ok('Imágenes de Jaeger, Grafana LGTM y Collector descargadas');
  }
  return true;
}

async function comprobarPuertos(hayDocker: boolean) {
  for (const puerto of PUERTOS_APPS) {
    if (await puertoLibre(puerto)) ok(`Puerto ${puerto} libre`);
    else fallo(`Puerto ${puerto} ocupado`, 'Lo usan las apps del curso. Cierra el programa que lo ocupa (¿un módulo arrancado en otra terminal?).');
  }

  // Si la infraestructura del curso ya está arrancada, es normal que ocupe sus puertos.
  const publicados = hayDocker
    ? spawnSync('docker', ['ps', '--filter', 'label=com.docker.compose.project=otel-curso', '--format', '{{.Ports}}'], {
        encoding: 'utf8',
      }).stdout
    : '';
  // Docker los muestra sueltos ("0.0.0.0:3000->3000/tcp") o en rango ("0.0.0.0:4317-4318->4317-4318/tcp").
  const rangos = [...publicados.matchAll(/:(\d+)(?:-(\d+))?->/g)].map((m) => [Number(m[1]), Number(m[2] ?? m[1])]);
  const esNuestro = (puerto: number) => rangos.some(([desde, hasta]) => puerto >= desde && puerto <= hasta);

  for (const puerto of PUERTOS_INFRA) {
    if (await puertoLibre(puerto)) ok(`Puerto ${puerto} libre`);
    else if (esNuestro(puerto)) ok(`Puerto ${puerto} en uso por la infraestructura del curso`);
    else fallo(`Puerto ${puerto} ocupado por otro programa`, 'Lo necesita la infraestructura del curso (Jaeger, Grafana o el Collector).');
  }
}

// La prueba clave: arranca la tienda del módulo 2 con el exportador de consola,
// le hace una petición y comprueba que aparece un span creado por la auto-instrumentación.
async function comprobarAutoInstrumentacion() {
  const puerto = await puertoAlAzar();
  const hijo = spawn(
    process.execPath,
    [
      require.resolve('tsx/cli'),
      '--env-file=env/consola.env',
      '--import',
      './modulos/m2-auto/instrumentation.ts',
      'modulos/m2-auto/app.ts',
    ],
    // En macOS y Linux, `detached` crea un grupo de procesos que luego cerramos de una vez.
    { cwd: raiz, env: { ...process.env, PORT: String(puerto) }, detached: process.platform !== 'win32' },
  );

  let salida = '';
  hijo.stdout.on('data', (trozo) => (salida += trozo));
  hijo.stderr.on('data', (trozo) => (salida += trozo));

  const esperarA = async (condicion: () => boolean, ms: number) => {
    const limite = Date.now() + ms;
    while (Date.now() < limite) {
      if (condicion()) return true;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    return condicion();
  };

  try {
    if (!(await esperarA(() => salida.includes('escuchando'), 20_000))) {
      fallo('La tienda de prueba no arrancó', `Salida:\n${salida.trim().slice(0, 600)}`);
      return;
    }
    await fetch(`http://localhost:${puerto}/productos/1`);
    const hayHttp = await esperarA(() => salida.includes('@opentelemetry/instrumentation-http'), 5_000);
    const hayExpress = salida.includes('@opentelemetry/instrumentation-express');

    if (hayHttp && hayExpress) {
      ok('La auto-instrumentación engancha: spans de http y express recibidos');
    } else {
      fallo(
        'La app responde, pero no aparecen spans automáticos',
        'Comprueba que package.json tiene "type": "commonjs" y que no has cambiado los comandos de arranque.',
      );
    }
  } finally {
    cerrarArbol(hijo);
  }
}

async function main() {
  console.log('\nComprobando tu equipo para el curso de OpenTelemetry\n');
  comprobarNode();
  comprobarDependencias();
  const hayDocker = comprobarDocker();
  await comprobarPuertos(hayDocker);
  if (fallos === 0 || existsSync(join(raiz, 'node_modules', 'tsx'))) {
    await comprobarAutoInstrumentacion();
  }

  console.log('');
  if (fallos > 0) {
    console.log(`Hay ${fallos} problema(s) que resolver antes de empezar.`);
    process.exit(1);
  }
  console.log(avisos > 0 ? `Todo funciona, con ${avisos} aviso(s).` : 'Todo listo. Ya puedes empezar con `npm run m1`.');
  process.exit(0);
}

main();
