import * as T from '../../types'

export const baseSplitPointer = <Ext extends T.ExtensionDef, Path extends T.ExtTopoPaths<Ext>>(
  pointer: T.Pointer<Ext, Path>,
) => {
  const [extId, path] = pointer.split('::') as [T.ExtId<Ext>, Path]
  return { extId, path }
}
export const splitExtId = <Ext extends T.ExtensionDef>(extId: T.ExtId<Ext>) => {
  const [extName, version] = extId.split('@') as [Ext['name'], Ext['version']]
  return { extName, version }
}

export const splitPointer = <Ext extends T.ExtensionDef, Path extends T.ExtTopoPaths<Ext>>(
  pointer: T.Pointer<Ext, Path>,
) => {
  const baspl = baseSplitPointer(pointer)
  const idspl = splitExtId(baspl.extId)
  return { ...baspl, ...idspl }
}

export const joinPointer = <Ext extends T.ExtensionDef, Path extends T.ExtTopoPaths<Ext>>(
  extId: T.ExtId<Ext>,
  path: Path,
): T.Pointer<Ext, Path> => `${extId}::${path}`

export const joinSemanticPointer = <Ext extends T.ExtensionDef, Path extends T.ExtTopoPaths<Ext>>(
  a: T.Pointer<Ext, Path>,
): T.SemanticPointer<Ext, Path> => {
  const aSplit = splitPointer(a)
  return `${aSplit.extName}::${aSplit.path}`
}

//
//
//
//
//
//
//
//
//
//
//
//
// type D = ExtensionDef<
//   'xxxx',
//   '1.4.3',
//   {
//     a: {
//       c: Port<number>
//       d: Port<string>
//       q: {
//         w: Port<number>
//         y: Port<string>
//       }
//     }
//     e: Port<boolean>
//   }
// >

// type x = ExtTopoPaths<D> extends ExtPortPaths<D> ? 1 : 0
// type y = ExtPortPaths<D> extends ExtTopoPaths<D> ? 1 : 0
// // type x =TOPO_NODE_SYM  extends TOPO_BASE_SYM&TOPO_NODE_SYM ? 1 :0

// type z = PortPathPayload<D, 'e'>
// const pooooooooooooooo: ExtPortPaths<D> = 'a.q.y'
// const tooooo: ExtTopoPaths<D> = ''
// const ccc: ExtTopoNodePaths<D> = ''

// const d: Pointer<D> = 'xxxx@1.4.3::a.q'
