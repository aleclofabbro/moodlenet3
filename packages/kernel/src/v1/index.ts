export * from './extension'
export { boot } from './kernel'
export * from './types'

class A {
  public x = 111
  constructor(public a: number) {}
}
console.log(new A(2))
console.log(JSON.stringify(new A(2)))
