import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { router } from "./trpc";
import { atRouter } from "./routers/auckland-transport"; // your router

// ------- tRPC root router -------
const appRouter = router({
    at: atRouter,
});

// Export type for client usage (from a shared package in the future)
export type AppRouter = typeof appRouter;

// ------- Static file serving (app/dist) -------
const distRoot = new URL("../app/dist/", import.meta.url).pathname;

async function serveStatic(req: Request): Promise<Response | null> {
    const url = new URL(req.url);
    let pathname = decodeURI(url.pathname);

    // API first; skip here
    if (pathname.startsWith("/trpc")) return null;

    // Normalize to file path under dist
    if (pathname === "/") pathname = "/index.html";
    const filePath = distRoot + pathname;

    // Try exact file
    let file = Bun.file(filePath);
    if (await file.exists()) {
        const headers = new Headers();
        // Cache aggressively for hashed assets
        if (pathname.startsWith("/assets/")) {
            headers.set("Cache-Control", "public, max-age=31536000, immutable");
        } else {
            headers.set("Cache-Control", "public, max-age=300");
        }
        return new Response(file, { headers });
    }

    // SPA fallback → index.html
    const index = Bun.file(distRoot + "/index.html");
    if (await index.exists()) {
        return new Response(index, { headers: { "Cache-Control": "no-cache" } });
    }

    // Nothing to serve
    return new Response("Not found", { status: 404 });
}

// ------- Unified handler -------
const handler = async (req: Request) => {
    const url = new URL(req.url);

    // tRPC endpoint
    if (url.pathname.startsWith("/trpc")) {
        return fetchRequestHandler({
            endpoint: "/trpc",
            req,
            router: appRouter,
            createContext: () => ({}),
            onError: ({ error, path }) => console.error("tRPC error:", { path, error }),
        });
    }

    // Static files / SPA
    const staticResp = await serveStatic(req);
    if (staticResp) return staticResp;

    return new Response("Not found", { status: 404 });
};

const port = Number(process.env.PORT ?? 3000);
console.log(`Server on http://localhost:${port}  (tRPC at /trpc)`);

Bun.serve({
    port,
    fetch: handler,
});
