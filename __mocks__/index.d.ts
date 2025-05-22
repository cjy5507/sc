// TypeScript declarations for mocks
declare module 'next/navigation' {
  export function useRouter(): {
    push: (url: string) => void;
    replace: (url: string) => void;
    prefetch: (url: string) => void;
    back: () => void;
    forward: () => void;
    refresh: () => void;
  };
  
  export function useSearchParams(): {
    get: (key: string) => string | null;
    getAll: (key: string) => string[];
    has: (key: string) => boolean;
    forEach: (callback: (value: string, key: string) => void) => void;
    entries: () => IterableIterator<[string, string]>;
    keys: () => IterableIterator<string>;
    values: () => IterableIterator<string>;
  };
  
  export function usePathname(): string;
  export function useParams(): Record<string, string>;
}

declare module 'bcrypt' {
  export function hash(data: string | Buffer, saltOrRounds: string | number): Promise<string>;
  export function compare(data: string | Buffer, encrypted: string): Promise<boolean>;
  export function genSalt(rounds?: number): Promise<string>;
}

declare module 'jsonwebtoken' {
  export function sign(
    payload: string | object | Buffer,
    secretOrPrivateKey: jwt.Secret,
    options?: jwt.SignOptions
  ): string;
  
  export function verify(
    token: string,
    secretOrPublicKey: jwt.Secret | jwt.GetPublicKeyOrSecret,
    options?: jwt.VerifyOptions
  ): object | string;
  
  export function decode(
    token: string,
    options?: jwt.DecodeOptions
  ): null | { [key: string]: any } | string;
}

// Global declarations
declare namespace NodeJS {
  interface Global {
    fetch: typeof fetch;
    TextEncoder: typeof TextEncoder;
    TextDecoder: typeof TextDecoder;
  }
}

declare const global: NodeJS.Global & typeof globalThis;
