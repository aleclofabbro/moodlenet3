import { Extension } from '@moodlenet/kernel/lib/v1'
import { ExtPort } from '@moodlenet/kernel/lib/v1/Extension'
import { start } from './pri-server'

Extension(module, {
  name: '@moodlenet/pri-http',
  version: '1.0.0',
  ports: {
    activate: ExtPort({}, async (shell) => {
      const server = await start({ port: shell.env.port })
      const _this = shell.lookup('@moodlenet/pri-http')!
      _this.gates.deactivate!
      shell.listen(({ message }) => {
        console.log('listen', message)

        if (shell.isMsg(_this.gates.deactivate, message)) {
          console.log('stop server')
          server.close()
        }
      })
    }),
    deactivate() {},
  },
})
