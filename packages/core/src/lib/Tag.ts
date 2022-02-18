const SYMBOL_TAG = Symbol('Tag')
export interface TagDef {}

export interface Tag extends TagDef {
  readonly [SYMBOL_TAG]: typeof SYMBOL_TAG
}

export const isTag = (_: any): _ is Tag => _ && _[SYMBOL_TAG] === SYMBOL_TAG

export const Tag = (): Tag => {
  return { [SYMBOL_TAG]: SYMBOL_TAG }
}
