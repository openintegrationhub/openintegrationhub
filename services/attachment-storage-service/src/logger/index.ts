import config from '../config';
import { createLogger } from '@elastic.io/bunyan-logger';
import { LogLevel } from 'bunyan';

export default createLogger({ name: 'maester', level: config.get('LOG_LEVEL') as LogLevel });
