import { filter, mergeMap, Subscription, take } from 'rxjs'
import type { ExtDef, ExtId, ExtTopo, Pointer, Skell, TypeofPath } from '../../types'
import { isMessage } from '../message'
import { joinPointer, splitPointer } from '../pointer'
import { ExtRpcTopoPaths, RpcFnOf, RpcTopoFnOf } from './types'
export * from './types'

export function reply<Def extends ExtDef>(skell: Pick<Skell<Def>, 'emit' | 'msg$'>) {
  return <Path extends ExtRpcTopoPaths<Def>>(pointer: Pointer<Def, Path>) =>
    (afn: RpcTopoFnOf<TypeofPath<ExtTopo<Def>, Path>>) => {
      const { requestPointer, responsePointer } = rpc_pointers<Def, Path>(pointer)
      return skell.msg$
        .pipe(
          filter(msg => isMessage<Def>()(msg, requestPointer as any)),
          mergeMap(async reqMsg => {
            try {
              const rpcTopoRespValue = await afn(...(reqMsg.data as any).rpcTopoReqArgs)
              return [reqMsg, { rpcTopoRespValue }] as const
            } catch (rpcTopoRespError) {
              return [reqMsg, { rpcTopoRespError }] as const
            }
          }),
        )
        .subscribe(([reqMsg, response]) => {
          const { path } = splitPointer(responsePointer)
          const respMsg = skell.emit(path as never)(response)
          return { req: reqMsg, resp: respMsg }
        })
    }
}
export function replyAll<Def extends ExtDef>(
  extId: ExtId<Def>,
  skell: Skell,
  handles: {
    [Path in ExtRpcTopoPaths<Def>]: RpcTopoFnOf<TypeofPath<ExtTopo<Def>, Path>>
  },
) {
  return Object.entries(handles).reduce(
    (__, [path, port]) => {
      const fullPath = joinPointer(extId, path)
      return {
        ...__,
        [fullPath]: reply(skell)(fullPath as never)(port as never),
      }
    },
    {} as {
      [Path in ExtRpcTopoPaths<Def>]: Subscription
    },
  )
}

export function caller<Def extends ExtDef>(skell: Skell, extId: ExtId<Def>) {
  return <Path extends ExtRpcTopoPaths<Def>>(path: Path) => {
    const fullPath = joinPointer(extId, path) as never

    return call<Def>(skell)<Path>(fullPath)
  }
}

export function call<Def extends ExtDef>(skell: Skell) {
  return <Path extends ExtRpcTopoPaths<Def>>(pointer: Pointer<Def, Path>): RpcFnOf<TypeofPath<ExtTopo<Def>, Path>> => {
    const { requestPointer, responsePointer } = rpc_pointers<Def, Path>(pointer)
    return ((...rpcTopoReqArgs: any[]) =>
      new Promise((resolve, reject) => {
        const requestPayload = { rpcTopoReqArgs }
        const reqSplitP = splitPointer(requestPointer)
        const reqMsg = skell.send<Def>(reqSplitP.extId)(reqSplitP.path as never)(requestPayload)
        // if (!requestMessage.consumedBy) {
        //   const msg = `calling rpc ${pointer}, message not consumed:\n${JSON.stringify(requestMessage)}`
        //   reject({ msg, errorCode: 'NOT_CONSUMED' }) //TODO: define standard errors/codes
        //   return
        // }
        return skell.msg$
          .pipe(
            filter(msg => msg.parentMsgId === reqMsg.id && isMessage<Def>()(msg, responsePointer as any)),
            take(1),
          )
          .subscribe(message => {
            const respData = message.data as any
            if ('rpcTopoRespError' in respData) {
              reject(respData.rpcTopoRespError)
            } else {
              resolve(respData.rpcTopoRespValue)
            }
            // { consume: true },
          })
      })) as any
  }
}

function rpc_pointers<Def extends ExtDef, Path extends ExtRpcTopoPaths<Def>>(pointer: Pointer<Def, Path>) {
  return {
    requestPointer: `${pointer}/rpcTopoRequest` as `${Pointer<Def, Path>}/rpcTopoRequest`,
    responsePointer: `${pointer}/rpcTopoResponse` as `${Pointer<Def, Path>}/rpcTopoResponse`,
  }
}

/*
 *
 *
 *
 */

// type D = ExtDef<
//   'xxxx',
//   '1.4.3',
//   {
//     d: Port<'in', string>
//     a: RpcTopo<Q>
//     s: {
//       g: Port<'in', 11>
//       v: {
//         l: Port<'out', string>
//         a: RpcTopo<Q>
//       }
//       // a: FunTopo<C>
//     }
//   }
// >
// declare const skell: Skell

// type C = <T>(t: T) => { _: T }
// type Q = <T>(t: T) => Promise<{ _: T }>

// const g = call<D>(skell)('xxxx@1.4.3::s/v/a')('10')

// replyAll<D>('xxxx@1.4.3', skell, {
//   's/v/a': async a => ({ _: a }),
//   'a': async a => ({ _: a }),
// })
// const j: ExtRpcTopoPaths<D> = 'a'
// listen.port<D>(s)('xxxx@1.4.3::s.v.l', ({ message: { payload } }) => {})
// listen.ext<D>(s, 'xxxx@1.4.3')('s.g', ({ message: { payload } }) => {})
