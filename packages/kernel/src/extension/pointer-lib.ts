import type { ExtensionDef, ExtId, ExtTopoPaths, Pointer, SemanticPointer } from './types'

export const baseSplitPointer = <Ext extends ExtensionDef, Path extends ExtTopoPaths<Ext>>(
  pointer: Pointer<Ext, Path>,
) => {
  const [extId, path] = pointer.split('::') as [ExtId<Ext>, Path]
  return { extId, path }
}
export const splitExtId = <Ext extends ExtensionDef>(extId: ExtId<Ext>) => {
  const [extName, version] = extId.split('@') as [Ext['name'], Ext['version']]
  return { extName, version }
}

export const splitPointer = <Ext extends ExtensionDef, Path extends ExtTopoPaths<Ext>>(pointer: Pointer<Ext, Path>) => {
  const baspl = baseSplitPointer(pointer)
  const idspl = splitExtId(baspl.extId)
  return { ...baspl, ...idspl }
}

export const joinPointer = <Ext extends ExtensionDef, Path extends ExtTopoPaths<Ext>>(
  extId: ExtId<Ext>,
  path: Path,
): Pointer<Ext, Path> => `${extId}::${path}`

export function joinSemanticPointer<Ext extends ExtensionDef, Path extends ExtTopoPaths<Ext>>(
  a: Pointer<Ext, Path>,
): SemanticPointer<Ext, Path> {
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
