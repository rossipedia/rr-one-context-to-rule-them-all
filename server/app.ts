import 'react-router';
import { createRequestHandler } from '@react-router/express';
import express from 'express';
import { type MyAppLoadContext, appLoadContext } from '~/MyAppLoadContext';
import type {
  ActionFunction,
  ActionFunctionArgs,
  LoaderFunction,
  LoaderFunctionArgs,
  ServerBuild,
  unstable_RouterContext,
  unstable_RouterContextProvider,
} from 'react-router';

declare module 'react-router' {
  // Yup, this works
  interface unstable_RouterContextProvider extends MyAppLoadContext {}
}

export const app = express();

// However, we need to actually install those things
type ServerRouteModule = NonNullable<ServerBuild['routes'][string]>['module'];

function enhanceRouterContextProvider({
  action,
  loader,
  ...mod
}: ServerRouteModule) {
  function enhanceDataFunction(fn: ActionFunction | LoaderFunction) {
    return (args: LoaderFunctionArgs | ActionFunctionArgs) => {
      const appContext = args.context.get(appLoadContext);
      const descriptors = Object.getOwnPropertyDescriptors(appContext);
      Object.defineProperties(args.context, descriptors);
      return fn(args);
    };
  }

  return {
    ...mod,
    action: action ? enhanceDataFunction(action) : undefined,
    loader: loader ? enhanceDataFunction(loader) : undefined,
  };
}

function enhanceServerBuild(build: ServerBuild): ServerBuild {
  return {
    ...build,
    routes: Object.fromEntries(
      Object.entries(build.routes).map(([routeId, route]) => [
        routeId,
        {
          ...route,
          module: route?.module
            ? enhanceRouterContextProvider(route.module)
            : undefined,
        } as ServerBuild['routes'][string],
      ])
    ),
  };
}

app.use(
  createRequestHandler({
    build: () =>
      import('virtual:react-router/server-build').then(enhanceServerBuild),
    getLoadContext: () =>
      new Map([
        [
          appLoadContext,
          {
            foo: () => 'This is a message from the load context!',
          },
        ],
      ]),
  })
);
