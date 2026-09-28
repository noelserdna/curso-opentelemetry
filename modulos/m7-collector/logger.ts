// Módulo 7 — El logger de la tienda (igual que en el módulo 6).
// Es un pino normal y corriente: aquí no hay nada de OpenTelemetry.
import pino from 'pino';

export const logger = pino({ level: 'info' });
