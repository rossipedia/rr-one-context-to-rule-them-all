import { unstable_createContext } from 'react-router';

export interface MyAppLoadContext {
  foo(): string;
}

export const appLoadContext = unstable_createContext<MyAppLoadContext>();
