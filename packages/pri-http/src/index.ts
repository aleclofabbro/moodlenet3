import { Extension } from '@moodlenet/kernel/lib/v1/Extension'
import createPriServer from './pri-server'

export default Extension(module, () => {
  const priServer = createPriServer()
  return [
    {
      async start() {
        priServer.start()
      },
    },
    {},
  ]
})
