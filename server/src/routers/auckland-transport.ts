import z from "zod";
import { getRoutes, getStops, getStopTrips } from "../lib/at";
import { publicProcedure, router } from "../trpc";

export const atRouter = router({
    getStops: publicProcedure.query(async () => {
        return await getStops();
    }),

    getRoutes: publicProcedure.query(async () => {
        return await getRoutes();
    }),

    getStopTrips: publicProcedure.input(
        z.object({
            id: z.string(),
            route: z.string().optional()
        })
    ).query(async ({ input }) => {
        return await getStopTrips(input.id, new Date(), 3, input.route);
    })
});
