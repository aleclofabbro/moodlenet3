import type { ExtDef, Message, Pointer, PortPathBinding, PortPaths } from '../../types'
import { isBWCSemanticallySamePointers } from '../pointer'

export function isMessage<DestDef extends ExtDef>() {
  return <Path extends PortPaths<DestDef, PortPathBinding<DestDef, Path>>>(
    msg: Message,
    matchPointer: Pointer<DestDef, Path>,
  ): msg is Message<PortPathBinding<DestDef, Path>, ExtDef, DestDef, Path> => {
    const checkRes = isBWCSemanticallySamePointers(msg.pointer, matchPointer)
    return checkRes === true
      ? //yes
        true
      : !checkRes
      ? //not at all
        false
      : //TODO: any warning ?
        // wrong version
        false
  }
}
