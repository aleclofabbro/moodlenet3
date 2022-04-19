import type { ExtDef, Message, Pointer, PortPathBinding, PortPaths } from '../../types'
import { isBWCSemanticallySamePointers } from '../pointer'

export function matchMessage<DestDef extends ExtDef>() {
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
      : // wrong version
        //TODO: any warning ?
        false
  }
}

export function onMessage<DestDef extends ExtDef>(msg: Message) {
  return <Path extends PortPaths<DestDef, PortPathBinding<DestDef, Path>>>(
    matchPointer: Pointer<DestDef, Path>,
    cb: (msg: Message<PortPathBinding<DestDef, Path>, ExtDef, DestDef, Path>) => unknown,
  ) => {
    if (matchMessage<DestDef>()<Path>(msg, matchPointer)) {
      cb(msg)
    }
  }
}
