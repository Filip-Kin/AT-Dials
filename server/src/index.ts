import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { router } from "./trpc";
import { atRouter } from "./routers/auckland-transport";

const appRouter = router({ at: atRouter });
export type AppRouter = typeof appRouter;

// absolute path to app/dist
const distRoot = new URL("../app/dist/", import.meta.url).pathname;

// try serving a file from app/dist (returns null if none)
async function tryStatic(pathname: string): Promise<Response | null> {
    // normalize: "/" => "/index.html"
    const rel = pathname === "/" ? "/index.html" : pathname;
    const filePath = distRoot + rel;

    const file = Bun.file(filePath);
    if (await file.exists()) {
        const headers = new Headers();
        // long cache for hashed assets (vite default: /assets/* with hash)
        if (rel.startsWith("/assets/")) {
            headers.set("Cache-Control", "public, max-age=31536000, immutable");
        } else {
            headers.set("Cache-Control", "public, max-age=300");
        }
        return new Response(file, { headers });
    }
    return null;
}

const handler = async (req: Request) => {
    const url = new URL(req.url);
    const pathname = decodeURI(url.pathname);

    // tRPC API
    if (pathname.startsWith("/trpc")) {
        return fetchRequestHandler({
            endpoint: "/trpc",
            req,
            router: appRouter,
            createContext: () => ({}),
            onError: ({ error, path }) => console.error("tRPC error:", { path, error }),
        });
    }

    // serve static file if it exists
    const staticResp = await tryStatic(pathname);
    if (staticResp) return staticResp;

    // SPA fallback → index.html for any non-API route
    const index = Bun.file(distRoot + "/index.html");
    if (await index.exists()) {
        return new Response(index, {
            headers: { "Cache-Control": "no-cache" },
        });
    }

    // nothing to serve (likely build didn’t run / wrong path)
    return new Response("Not found", { status: 404 });
};

const port = Number(process.env.PORT ?? 3000);
console.log(`Server on http://localhost:${port} (tRPC at /trpc)`);

Bun.serve({ port, fetch: handler });
