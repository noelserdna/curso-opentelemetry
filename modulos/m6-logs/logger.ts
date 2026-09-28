// Módulo 6 — El logger de la tienda.
// Es un pino normal y corriente: aquí no hay nada de OpenTelemetry.
import pino from 'pino';

export const logger = pino({ level: 'info' });
