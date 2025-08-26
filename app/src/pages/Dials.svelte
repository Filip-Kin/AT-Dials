<script lang="ts">
	import { onMount } from "svelte";
	import { trpc } from "../trpc";
	import GaugeDial from "../components/GaugeDial.svelte";
	import type { StopTrip } from "../../../server/src/lib/at";

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
	$inspect(data);

	const clock = (d: Date | null) => (d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "—");

	// Layout sizing (kept simple)
	let dialSize = $state(120);

	onMount(async () => {
		await update();
		setInterval(update, 30000);
	});

	async function update() {
		let updatePromises = [];
		let newData: Card[] = [];
		for (const stop of config) {
			updatePromises.push(
				new Promise(async (resolve) => {
					const trips = await trpc.at.getStopTrips.query({ id: stop.id });
					if (!trips[0]) {
						resolve(void 0);
						return;
					}

					const now = Date.now();
					const ms = trips[0].departureTime.getTime() - now;

					newData.push({
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
					resolve(void 0);
				})
			);
		}
		await Promise.all(updatePromises);
		data = [...newData];
	}

	function enableAutoFullscreen() {
		document.documentElement.requestFullscreen();
	}
	onMount(() => {
		window.addEventListener("click", enableAutoFullscreen);
	});
</script>

<!-- Full viewport, two columns, fixed row heights, no vertical scroll -->
<div class="grid grid-cols-2 gap-6 p-4 h-screen overflow-hidden bg-neutral-950">
	{#each data as trip (trip.id)}
		<div class="rounded-2xl shadow p-4 bg-neutral-900 text-white flex flex-col justify-between h-full overflow-hidden">
			<!-- Header -->
			<div class="text-xl font-semibold leading-tight truncate">{trip.name}</div>
			<div class="text-lg mb-1 text-white/90 leading-tight truncate">
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
					maxMinutes={20}
					needleTransition="transform 750ms cubic-bezier(.22,1,.36,1)"
					needleClass="sweep"
				/>
			</div>

			<!-- Footer -->
			<div class="mt-1 text-lg w-full text-center">
				Next: {clock(trip.nextTime)}
			</div>
		</div>
	{/each}
</div>
