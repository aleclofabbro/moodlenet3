import type { ExtensionDef, FunTopo, Port, PortShell } from '@moodlenet/kernel'

export type LogLevel = typeof logLevels extends readonly (infer Lev)[] ? Lev : never

export type LogOptions = {}

export type Log = {} | { _logOpts: LogOptions }

export type MoodlenetSysLogPorts = {
  [level in LogLevel]: Port<Log>
} & { lib: FunTopo<() => MoodlenetSysLogLib> }

export type MoodlenetSysLogExt = ExtensionDef<'moodlenet.sys-log', '0.0.1', MoodlenetSysLogPorts>

export type MoodlenetSysLogLib = {
  [level in LogLevel]: (log: Log) => void
}

export const logLevels = ['debug', 'log', 'info', 'warn', 'error', 'fatal'] as const

export const moodlenetSysLogLib = (shell: PortShell): MoodlenetSysLogLib => {
  const logPort = shell.push<MoodlenetSysLogExt>('moodlenet.sys-log@0.0.1')

  return {
    debug: logPort('debug'),
    error: logPort('error'),
    fatal: logPort('fatal'),
    info: logPort('info'),
    log: logPort('log'),
    warn: logPort('warn'),
  }
}
