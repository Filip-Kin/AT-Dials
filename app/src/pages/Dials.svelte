<script lang="ts">
	import { onMount } from "svelte";
	import { trpc } from "../trpc";
	import type { Route, Stop, StopTrip } from "../../../server/src/lib/at";

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
		{
			id: "7540-583fbdc2",
			walkTime: 5,
			runTime: 3,
			name: "74 Bus",
			direction: "Glen Innes",
		},
		{
			id: "1759-1cb249c7",
			walkTime: 12,
			runTime: 5,
			name: "70 Bus",
			direction: "Ellerslie",
		},
		{
			id: "1760-317dbc99",
			walkTime: 12,
			runTime: 5,
			name: "70 Bus",
			direction: "Botany",
		},
		{
			id: "9407-ebcb6116",
			walkTime: 12,
			runTime: 5,
			name: "Eastern Line",
			direction: "Waitematā",
		},
		{
			id: "9406-ffd612d1",
			walkTime: 12,
			runTime: 5,
			name: "Eastern Line",
			direction: "Manukau",
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
		console.log(data);
	});

	function update() {}
</script>

<div class="grid grid-cols-2">
	{#each data as trip}
		<div class="flex flex-col">
			<div>{trip.name}</div>
			<div>{trip.direction}</div>
			<div>{trip.formattedTime}</div>
		</div>
	{/each}
</div>
