import type { ExtDef, Port, Shell } from '@moodlenet/kernel'

export const logLevels = ['debug', 'log', 'info', 'warn', 'error', 'fatal'] as const
export type LogLevels = { [index in keyof typeof logLevels]: typeof logLevels[index] }
export type LogLevel = LogLevels[number]
export type LogOptions = {}

export type Log = {} | { _logOpts: LogOptions }

export type MoodlenetSysLogExt = ExtDef<'moodlenet.sys-log', '0.0.1', { [level in LogLevel]: Port<'in', Log> }>

export type MoodlenetSysLogLib = {
  [level in LogLevel]: (log: Log) => void
}

export const moodlenetSysLogLib = (shell: Shell): MoodlenetSysLogLib => {
  const logPort = shell.push('in')<MoodlenetSysLogExt>('moodlenet.sys-log@0.0.1')

  return {
    debug: logPort('debug'),
    error: logPort('error'),
    fatal: logPort('fatal'),
    info: logPort('info'),
    log: logPort('log'),
    warn: logPort('warn'),
  }
}
