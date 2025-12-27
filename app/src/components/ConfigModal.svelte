<script lang="ts">
	import { onMount } from "svelte";
	import { trpc } from "../trpc";
	import type { StopConfig } from "../pages/Dials.svelte";

	let {
		open = $bindable(false),
		onAdd,
	}: {
		open: boolean;
		onAdd: (stop: StopConfig) => void;
	} = $props();

	type Stop = {
		id: string;
		name: string;
		description?: string;
	};

	let stops: Stop[] = [];
	let loading = $state(false);
	let filter = $state("");
	let previewMap: Record<string, { loading: boolean; trips: Awaited<ReturnType<typeof trpc.at.getStopTrips.query>> | null }> = $state({});
	let editingStop: StopConfig | null = $state(null);
	let routesForStop: string[] = $state([]);

	onMount(async () => {
		await loadStops();
	});

	async function loadStops() {
		loading = true;
		try {
			const res = await trpc.at.getStops.query();
			stops = (res || []).map((s: any) => ({ id: s.id, name: s.name, description: s.description }));
		} catch (err) {
			// eslint-disable-next-line no-console
			console.warn("Failed to load stops", err);
			stops = [];
		} finally {
			loading = false;
		}
	}

	let filtered: Stop[] = $state([]);
	$effect(() => {
		filtered = filter.trim() ? stops.filter((s) => (s.name + s.id + (s.description || "")).toLowerCase().includes(filter.toLowerCase())) : stops;
	});

	async function previewStop(id: string) {
		previewMap[id] = { loading: true, trips: null };
		try {
			const trips = await trpc.at.getStopTrips.query({ id });
			previewMap[id] = { loading: false, trips };
			routesForStop = Array.from(new Set(trips.map((t) => t.routeId)));
		} catch (err) {
			// eslint-disable-next-line no-console
			console.warn("Failed to preview stop trips", err);
			previewMap[id] = { loading: false, trips: [] };
		}
	}

	function addStopFromPreview(id: string) {
		const p = previewMap[id];
		if (!p || !p.trips || p.trips.length === 0) return;
		const t = p.trips[0];
		// Create the minimal StopConfig expected by Dials and start editing
		const stopConfig: StopConfig = {
			id,
			walkTime: 5,
			runTime: 3,
			name: t.routeId,
			direction: t.stopHeadsign,
			route: t.routeId,
		};

		editingStop = stopConfig;
	}

	function confirmAdd() {
		if (!editingStop) return;
		onAdd(editingStop);
		editingStop = null;
	}

	function cancelEdit() {
		editingStop = null;
	}

	function close() {
		open = false;
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center">
		<div class="absolute inset-0 bg-black/50" onclick={close}></div>
		<div class="absolute top-12 w-[90%] max-w-3xl bg-neutral-800 text-white rounded-lg shadow-lg p-4 max-h-[90vh] overflow-auto z-10">
			<div class="flex items-center justify-between mb-3">
				<h3 class="text-lg font-semibold">Configure Dials</h3>
				<button class="px-3 py-1 bg-neutral-700 rounded" onclick={close}>Close</button>
			</div>

			{#if editingStop}
				<div class="p-3 mt-2 bg-neutral-800 rounded">
					<div class="grid grid-cols-2 gap-2">
						<div>
							<label class="text-sm text-neutral-300">Route</label>
							<select class="w-full p-2 rounded bg-neutral-700" bind:value={editingStop.route}>
								{#each routesForStop as route}
									<option value={route}>{route}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="text-sm text-neutral-300">Name</label>
							<input class="w-full p-2 rounded bg-neutral-700" bind:value={editingStop.name} />
						</div>
						<div>
							<label class="text-sm text-neutral-300">Direction</label>
							<input class="w-full p-2 rounded bg-neutral-700" bind:value={editingStop.direction} />
						</div>
						<div>
							<label class="text-sm text-neutral-300">Walk Time (min)</label>
							<input type="number" min="0" class="w-full p-2 rounded bg-neutral-700" bind:value={editingStop.walkTime} />
						</div>
						<div>
							<label class="text-sm text-neutral-300">Run Time (min)</label>
							<input type="number" min="0" class="w-full p-2 rounded bg-neutral-700" bind:value={editingStop.runTime} />
						</div>
					</div>
					<div class="flex gap-2 mt-3">
						<button class="px-3 py-2 bg-green-600 rounded" onclick={confirmAdd}>Confirm</button>
						<button class="px-3 py-2 bg-neutral-700 rounded" onclick={cancelEdit}>Cancel</button>
					</div>
				</div>
			{:else}
				<div class="mb-3">
					<input class="w-full p-2 rounded bg-neutral-700" placeholder="Search stops..." bind:value={filter} />
				</div>

				<div class="h-full overflow-auto">
					{#if loading}
						<div>Loading stops…</div>
					{:else}
						{#each filtered as stop}
							{@const preview = previewMap[stop.id]}
							<div class="flex items-center justify-between p-2 border-b border-neutral-700">
								<div class="flex-1">
									<div class="font-medium truncate">{stop.name}</div>
									<div class="text-sm text-neutral-400 truncate">{stop.id} {stop.description}</div>
								</div>
								<div class="flex items-center gap-2">
									{#if !preview}
										<button class="px-2 py-1 bg-neutral-700 rounded" onclick={() => previewStop(stop.id)}>Preview</button>
									{:else}
										<button class="px-2 py-1 bg-green-600 rounded" onclick={() => addStopFromPreview(stop.id)}>Add</button>
									{/if}
								</div>
							</div>
							{#if preview}
								<div class="p-2 text-sm text-neutral-300 bg-neutral-900">
									{#if preview.loading}
										Loading trips...
									{:else if preview.trips && preview.trips.length > 0}
										<div class="font-semibold">Upcoming:</div>
										<div class="grid grid-cols-3 gap-2 mt-1">
											{#each preview.trips.slice(0, 6) as t}
												<div class="p-1 bg-neutral-800 rounded">
													{t.routeId} → {t.stopHeadsign} @ {new Date(t.departureTime).toLocaleTimeString([], {
														hour: "2-digit",
														minute: "2-digit",
														hour12: false,
													})}
												</div>
											{/each}
										</div>
									{:else}
										<div>No upcoming trips found.</div>
									{/if}
								</div>
							{/if}
						{/each}
					{/if}
				</div>
			{/if}
		</div>
	</div>
{/if}
