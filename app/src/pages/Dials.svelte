<script lang="ts">
	import { onMount } from "svelte";
	import { trpc } from "../trpc";
	import type { Route, Stop, StopTrip } from "../../../server/src/lib/at";

	let stops: Stop[] = $state([]);
	let routes: Route[] = $state([]);
	let stopTrips: StopTrip[] = $state([]);

	let config: {
		id: string;
		walkTime: number;
		runTime: number;
		name: string;
		direction: string;
	}[] = [
		{
			id: "7537-41d856a0",
			walkTime: 5,
			runTime: 3,
			name: "74 Bus",
			direction: "Sylvia Park",
		},
	];

	let data: {
		id: string;
		name: string;
		direction: string;
		timeUntilNextService: number;
		formattedTime: string;
		trips: StopTrip[];
	}[] = $state([]);

	onMount(async () => {
		for (let stop of config) {
			const trips = await trpc.at.getStopTrips.query({
				id: stop.id,
			});

			const nextTrip = trips[0];

			if (!nextTrip) continue;

			const timeUntilNextService = nextTrip.departureTime.getTime() - Date.now();

			data.push({
				id: stop.id,
				name: stop.name,
				direction: stop.direction,
				timeUntilNextService,
				formattedTime: `${Math.ceil(timeUntilNextService / 60000)} min`,
				trips,
			});
		}
	});

	function update() {}
</script>

<!-- <div class="grid grid-cols-4">
	{#each stops as stop}
		<div>{stop.id}</div>
		<div>{stop.code}</div>
		<div>{stop.name}</div>
		<div>{stop.location_type}</div>
	{/each}
</div> -->

<!-- <div class="grid grid-cols-4">
	{#each routes as route}
		<div>{route.id}</div>
		<div>{route.shortName}</div>
		<div>{route.longName}</div>
		<div>{route.type}</div>
	{/each}
</div> -->

<div class="grid grid-cols-2">
	{#each data as trip}
		<div class="flex flex-col">
			<div>{trip.name}</div>
			<div>{trip.direction}</div>
			<div>{trip.formattedTime}</div>
		</div>
	{/each}
</div>
