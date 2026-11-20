interface ImportMeta {
  readonly env?: {
    readonly DEV?: boolean;
    readonly [key: string]: unknown;
  };
}
