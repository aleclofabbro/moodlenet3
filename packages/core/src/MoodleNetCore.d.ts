type ActionOpts = {}
interface MnPackageDef {
  mw: MnMiddleware[]
  actions: { [Type: string]: MnActionDef }
}

interface MnActionDef<Payload = unknown> {
  validate?(_: Payload): boolean
}

interface MnPackage<PkgId extends string, Def extends MnPackageDef> {
  id: PkgId
  mw: MnMiddleware[]
  actions: {
    [Type in keyof Def['actions']]: Def['actions'][Type] extends MnActionDef<
      infer Payload
    >
      ? Type extends string
        ? MnActionTrigger<PkgId, Type, Payload>
        : never
      : never
  }
}

interface MnActionTrigger<
  Pkg extends string = string,
  Type extends string = string,
  Payload = unknown
> {
  (_: Payload, opts?: ActionOpts): void
  is(_: Action): _ is Action<Pkg, Type, Payload>
}

interface MnMiddleware {
  (action: Action, next: () => void, ctx: unknown): void
}

interface Action<
  Type extends string = string,
  Pkg extends string = string,
  Payload = unknown
> {
  uid: string
  pkg: Pkg
  type: Type
  payload: Payload
  date: Date
}
