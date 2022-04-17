import { mergeMap, Observable, of, OperatorFunction, Subject } from 'rxjs'
export type MWFn<T> = (t: T) => Observable<T>

export const MwPiper = <T>(): {
  op: OperatorFunction<T, T>
  add: (_: MWFn<T>) => () => void
} => {
  let mwFnPipe: MWFn<T>[] = []
  const subj = new Subject<T>()
  return {
    op: o => {
      o.subscribe({
        complete: subj.complete,
        error: subj.error,
        next: t => {
          mwFnPipe
            .reduce<Observable<T>>((_, p) => {
              return _.pipe(mergeMap(p))
            }, of(t))
            .subscribe({
              next: _ => subj.next(_),
            })
        },
      })
      return subj.asObservable()
    },
    add: mwFn => {
      mwFnPipe = [...mwFnPipe, mwFn]
      return () => {
        mwFnPipe = mwFnPipe.filter(filteringMwFn => filteringMwFn !== mwFn)
      }
    },
  }
}
