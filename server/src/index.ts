import { atRouter } from './routers/auckland-transport';
import { router } from './trpc';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

const appRouter = router({
    at: atRouter
});

// Export type router type signature,
// NOT the router itself.
export type AppRouter = typeof appRouter;
const handler = (req: Request) => {
    const url = new URL(req.url);

    if (url.pathname.startsWith('/trpc')) {
        return fetchRequestHandler({
            endpoint: '/trpc',
            req,
            router: appRouter,
            createContext: () => ({}),
        });
    }

    return new Response('Not found', { status: 404 });
};

const port = Number(process.env.PORT ?? 3000);
console.log(`tRPC server on http://localhost:${port}/trpc`);

Bun.serve({
    port,
    fetch: handler,
});