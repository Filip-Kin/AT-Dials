import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '../../server/src/index';

export const trpc = createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: '/trpc', transformer: superjson })],
});