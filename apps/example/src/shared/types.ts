// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ReturnType2<T extends (...args: any) => (...args: any) => any> =
  ReturnType<ReturnType<T>>;
