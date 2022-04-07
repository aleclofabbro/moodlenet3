import { ExtensionDef, Port, PortShell } from '@moodlenet/kernel/lib/v1'

const logLevels = ['debug', 'log', 'info', 'warn', 'error', 'fatal'] as const
export type LogLevel = typeof logLevels extends readonly (infer Lev)[] ? Lev : never

export type LogOptions = {}

export type Log = {} | { _logOpts: LogOptions }

export type MoodlenetSysLogPorts = {
  [level in LogLevel]: Port<Log>
}

export type MoodlenetSysLogExt = ExtensionDef<'moodlenet.sys-log', '1.0.0', MoodlenetSysLogPorts>

export const logger = (
  shell: PortShell,
): {
  [level in LogLevel]: (log: Log) => void
} => {
  const logPort = shell.push<MoodlenetSysLogExt>('moodlenet.sys-log')
  return {
    debug: logPort('debug'),
    error: logPort('error'),
    fatal: logPort('fatal'),
    info: logPort('info'),
    log: logPort('log'),
    warn: logPort('warn'),
  }
}