import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

export const startInstance = createStart(() => ({
  requestMiddleware: [
    // Server functions are same-origin RPC; reject cross-site invocations.
    createCsrfMiddleware({ filter: ({ handlerType }) => handlerType === "serverFn" }),
  ],
}));
