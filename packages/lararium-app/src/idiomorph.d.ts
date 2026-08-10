/**
 * idiomorph ships no type declarations, so its import resolved to an implicit `any` and the typecheck
 * witness read RED on a package nobody was editing. A witness that stands permanently red trains a
 * reader to skip it, which costs more than the shim.
 *
 * Declared narrowly: only the surface this vessel calls. A wider `any` would hand back the silence.
 */
declare module "idiomorph" {
  export interface MorphOptions {
    readonly morphStyle?: "innerHTML" | "outerHTML";
    readonly ignoreActiveValue?: boolean;
    readonly head?: { readonly style?: "merge" | "append" | "morph" | "none" };
  }
  export const Idiomorph: {
    morph(oldNode: Element, newContent: string | Element, options?: MorphOptions): void;
  };
}
