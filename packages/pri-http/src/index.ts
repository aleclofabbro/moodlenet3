import { MNModule } from '@moodlenet/process/lib/MNModule'
import { MNPackage } from '@moodlenet/process/lib/MNPackage'
import { httpServer } from './server'

const pkg = new MNPackage(module, {
  modules: {
    server: new MNModule({
      components: {
        http: httpServer,
      },
    }),
  },
})
export default pkg
