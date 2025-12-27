<script lang="ts" module>
	export type StopConfig = {
		id: string;
		walkTime: number;
		runTime: number;
		name: string;
		direction: string;
		route: string;
	};
</script>

<script lang="ts">
	import { onMount } from "svelte";
	import { trpc } from "../trpc";
	import GaugeDial from "../components/GaugeDial.svelte";
	import ConfigModal from "../components/ConfigModal.svelte";
	import type { StopTrip } from "../../../server/src/lib/at";

	let config: StopConfig[] = $state([]);

	async function loadConfig() {
		const configParam = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("config") : null;
		if (configParam) {
			try {
				const decoded = typeof atob === "function" ? atob(configParam) : Buffer.from(configParam, "base64").toString("utf-8");
				const parsed = JSON.parse(decoded) as StopConfig[];
				if (Array.isArray(parsed)) {
					config = parsed;
					return;
				}
				// If parsing didn't yield an array, fall through to other methods
				console.warn("config query param decoded but did not parse to an array, falling back");
			} catch (err) {
				console.warn("Failed to decode/parse config query param, falling back:", err);
			}
		}
	}

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

	let modalOpen = $state(false);

	const clock = (d: Date | null) => (d ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false }) : "—");

	// Layout sizing (kept simple)
	let dialSize = $state(120);

	onMount(async () => {
		await loadConfig();
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
		await Promise.allSettled(updatePromises);
		data = [...newData];
	}

	function enableAutoFullscreen() {
		document.documentElement.requestFullscreen();
	}
	onMount(() => {
		window.addEventListener("click", enableAutoFullscreen);
	});

	function handleAdd(detail: StopConfig) {
		// avoid duplicates
		if (config.find((c) => c.id === detail.id && c.name === detail.name && c.direction === detail.direction)) {
			modalOpen = false;
			return;
		}
		config = [...config, detail];
		// update immediately
		update();
		// sync URL whenever config changes
		syncConfigToUrl();
		modalOpen = false;
	}

	function syncConfigToUrl() {
		try {
			const json = JSON.stringify(config || []);
			const b64 = typeof btoa === "function" ? btoa(json) : Buffer.from(json, "utf-8").toString("base64");
			if (typeof window !== "undefined") {
				const url = new URL(window.location.href);
				if (url.searchParams.get("config") !== b64) {
					url.searchParams.set("config", b64);
					window.history.replaceState(null, "", url.toString());
				}
			}
		} catch (err) {
			// eslint-disable-next-line no-console
			console.warn("Failed to sync config to URL", err);
		}
	}
</script>

<!-- Full viewport, two columns, fixed row heights, no vertical scroll -->
<!-- Configure button is transparent when a config exists; fully visible when no config -->
<button
	class={`px-3 py-2 text-white rounded absolute top-4 right-4 z-50 transition-opacity duration-200 bg-blue-600 ${
		config && config.length > 0 ? "opacity-0 hover:opacity-100" : "opacity-100"
	}`}
	onclick={() => (modalOpen = true)}
>
	Configure
</button>

<ConfigModal bind:open={modalOpen} onAdd={handleAdd} />

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
