type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'ALERT';

export class Logger {
  static log(level: LogLevel, message: string, data?: any) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      message,
      ...(data && { data })
    };

    console.log(JSON.stringify(logEntry));

    if (level === 'ALERT' || level === 'ERROR') {
      // Here you could add hooks for Discord, Slack, or Email alerts
      this.sendAlert(logEntry);
    }
  }

  static info(message: string, data?: any) {
    this.log('INFO', message, data);
  }

  static warn(message: string, data?: any) {
    this.log('WARN', message, data);
  }

  static error(message: string, data?: any) {
    this.log('ERROR', message, data);
  }

  static alert(message: string, data?: any) {
    this.log('ALERT', message, data);
  }

  private static sendAlert(logEntry: any) {
    // Mock alert hook
    // if (process.env.WEBHOOK_URL) { ... }
  }
}
