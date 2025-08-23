import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { router } from "./trpc";
import { atRouter } from "./routers/auckland-transport";
import path from "path";
import { fileURLToPath } from "url";

const appRouter = router({ at: atRouter });
export type AppRouter = typeof appRouter;

// Proper, cross-platform absolute path to app/dist
const distRoot = fileURLToPath(new URL("../../app/dist/", import.meta.url));

function safeJoin(root: string, rel: string) {
    const p = path.normalize(path.join(root, rel));
    // prevent path traversal
    if (!p.startsWith(root)) return null;
    return p;
}

async function tryStatic(pathname: string): Promise<Response | null> {
    // "/" -> "index.html"; strip leading slash otherwise
    const rel = pathname === "/" ? "index.html" : pathname.replace(/^\//, "");
    const filePath = safeJoin(distRoot, rel);
    if (!filePath) return null;

    const file = Bun.file(filePath);
    if (!(await file.exists())) return null;

    const relPosix = rel.replaceAll("\\", "/");
    const headers = new Headers();
    if (relPosix.startsWith("assets/")) {
        headers.set("Cache-Control", "public, max-age=31536000, immutable");
    } else {
        headers.set("Cache-Control", "public, max-age=300");
    }
    return new Response(file, { headers });
}

const handler = async (req: Request) => {
    const url = new URL(req.url);
    const pathname = decodeURI(url.pathname);

    if (pathname.startsWith("/trpc")) {
        return fetchRequestHandler({
            endpoint: "/trpc",
            req,
            router: appRouter,
            createContext: () => ({}),
        });
    }

    // Serve static or SPA fallback
    const staticResp = await tryStatic(pathname);
    if (staticResp) return staticResp;

    const index = Bun.file(path.join(distRoot, "index.html"));
    if (await index.exists()) {
        return new Response(index, { headers: { "Cache-Control": "no-cache" } });
    }
    return new Response("Not found", { status: 404 });
};

const port = Number(process.env.PORT ?? 3000);
console.log(`Server on http://localhost:${port} (tRPC at /trpc)`);

Bun.serve({ port, fetch: handler });
