import { customAlphabet } from 'nanoid'
const uidAlphabet = `0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz`
export const uid = customAlphabet(uidAlphabet, 30)
