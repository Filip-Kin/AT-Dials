<script lang="ts">
	import { onMount } from "svelte";
	import { trpc } from "../trpc";
	import GaugeDial from "../components/GaugeDial.svelte";
	import type { StopTrip } from "../../../server/src/lib/at";

	const COLS = 2;

	const config = [
		{ id: "7537-41d856a0", walkTime: 5, runTime: 3, name: "74 Bus", direction: "Sylvia Park" },
		{ id: "7540-583fbdc2", walkTime: 5, runTime: 3, name: "74 Bus", direction: "Glen Innes" },
		{ id: "1759-1cb249c7", walkTime: 12, runTime: 5, name: "70 Bus", direction: "Ellerslie" },
		{ id: "1760-317dbc99", walkTime: 12, runTime: 5, name: "70 Bus", direction: "Botany" },
		{ id: "9407-ebcb6116", walkTime: 12, runTime: 5, name: "Eastern Line", direction: "Waitematā" },
		{ id: "9406-ffd612d1", walkTime: 12, runTime: 5, name: "Eastern Line", direction: "Manukau" },
	] as const;

	type Card = {
		id: string;
		name: string;
		direction: string;
		walkTime: number;
		runTime: number;
		minutesLeft: number;
		currentTime: Date | null;
		nextTime: Date | null;
		trips: StopTrip[];
	};

	let data: Card[] = $state([]);

	const clock = (d: Date | null) => (d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—");

	// Layout sizing (kept simple)
	let rowHeight = $state(260);
	let dialSize = $state(160);

	const GRID_VPAD = 32; // p-4 top+bottom on the grid
	const GAP_Y = 24; // gap-6 between rows
	const NON_DIAL = 150; // rough space for header + footer + card padding

	function computeSizes() {
		const count = data.length || config.length;
		const rows = Math.max(1, Math.ceil(count / COLS));

		const vh = window.innerHeight;
		const available = vh - GRID_VPAD - (rows - 1) * GAP_Y;

		const perRow = Math.max(160, Math.floor(available / rows));
		rowHeight = perRow;

		// Keep the dial inside the row; avoid clamps, keep it simple
		const s = Math.min(Math.max(60, perRow - NON_DIAL), 300);
		dialSize = Math.floor(s);
	}

	onMount(async () => {
		window.addEventListener("resize", computeSizes);

		for (const stop of config) {
			const trips = await trpc.at.getStopTrips.query({ id: stop.id });
			if (!trips[0]) continue;

			const now = Date.now();
			const ms = trips[0].departureTime.getTime() - now;

			data.push({
				id: stop.id,
				name: stop.name,
				direction: stop.direction,
				walkTime: stop.walkTime,
				runTime: stop.runTime,
				minutesLeft: Math.max(0, Math.ceil(ms / 60000)),
				currentTime: trips[0]?.departureTime ?? null,
				nextTime: trips[1]?.departureTime ?? null,
				trips,
			});
		}

		computeSizes();
		return () => window.removeEventListener("resize", computeSizes);
	});

	// Advance and refresh times every 20s
	onMount(() => {
		const t = setInterval(() => {
			const now = Date.now();
			for (const d of data) {
				while (d.trips.length && d.trips[0].departureTime.getTime() <= now) d.trips.shift();
				d.currentTime = d.trips[0]?.departureTime ?? null;
				d.nextTime = d.trips[1]?.departureTime ?? null;
				d.minutesLeft = d.currentTime ? Math.max(0, Math.ceil((d.currentTime.getTime() - now) / 60000)) : 0;
			}
		}, 20000);
		return () => clearInterval(t);
	});
</script>

<!-- Full viewport, two columns, fixed row heights, no vertical scroll -->
<div class="grid grid-cols-2 gap-6 p-4 h-screen overflow-hidden bg-neutral-950" style={`grid-auto-rows:${rowHeight}px`}>
	{#each data as trip (trip.id)}
		<div class="rounded-2xl shadow p-4 bg-neutral-900 text-white flex flex-col justify-between h-full overflow-hidden">
			<!-- Header -->
			<div class="mb-1 text-xl font-semibold leading-tight truncate">{trip.name}</div>
			<div class="mb-2 text-lg text-white/90 leading-tight truncate">
				{trip.direction} @ {clock(trip.currentTime)}
			</div>

			<!-- Dial -->
			<div class="flex items-center justify-center">
				<GaugeDial
					minutesLeft={trip.minutesLeft}
					walkTime={trip.walkTime}
					runTime={trip.runTime}
					size={dialSize}
					stroke={Math.max(8, Math.round(dialSize * 0.08))}
				/>
			</div>

			<!-- Footer -->
			<div class="mt-2 text-lg w-full text-center">
				Next: {clock(trip.nextTime)}
			</div>
		</div>
	{/each}
</div>
