import type { ExtDef, ExtId, Message, Pointer, PortPathBinding, PortPaths } from '../../types'
import { isBWCSemanticallySamePointers } from '../pointer'

export function matchMessage<DestDef extends ExtDef>() {
  return <Path extends PortPaths<DestDef, PortPathBinding<DestDef, Path>>>(
    msg: Message,
    matchPointer: Pointer<DestDef, Path>,
  ): msg is Message<PortPathBinding<DestDef, Path>, ExtDef, DestDef, Path> => {
    return isBWCSemanticallySamePointers(msg.pointer, matchPointer)
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

export function manageMsg(msg: Message, extId: ExtId) {
  msg.managedBy = extId
  return msg
}
