<script lang="ts">
	let {
		minutesLeft = 0,
		walkTime = 10,
		runTime = 5,
		size = 180,
		stroke = 16,
		startDeg = -135,
		endDeg = 135,
		maxMinutes = null,
		needleClass = "",
		needleTransition = "transform 300ms ease",
	}: {
		minutesLeft?: number;
		walkTime?: number;
		runTime?: number;
		size?: number;
		stroke?: number;
		startDeg?: number;
		endDeg?: number;
		maxMinutes?: number | null;
		needleClass?: string;
		needleTransition?: string;
	} = $props();

	const cx = size / 2;
	const cy = size / 2;
	const r = size / 2 - stroke;

	const _max = Math.max(maxMinutes ?? 0, walkTime * 2, runTime * 2, minutesLeft + 5, 10);

	const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

	function angleFor(mins: number) {
		const m = clamp(mins, 0, _max);
		const t = 1 - m / _max; // 0 -> startDeg, 1 -> endDeg
		return startDeg + t * (endDeg - startDeg);
	}

	function polarToCartesian(cx: number, cy: number, radius: number, angle: number) {
		const rad = ((angle - 90) * Math.PI) / 180;
		return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
	}

	function describeArc(cx: number, cy: number, radius: number, startAngle: number, endAngle: number) {
		const start = polarToCartesian(cx, cy, radius, startAngle);
		const end = polarToCartesian(cx, cy, radius, endAngle);
		const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
		return `M ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${end.x} ${end.y}`;
	}

	// segment minute bounds
	const redLo = 0,
		redHi = runTime;
	const yelLo = runTime,
		yelHi = walkTime;
	const grnLo = walkTime,
		grnHi = _max;

	// arc angles
	const redStart = angleFor(redHi),
		redEnd = angleFor(redLo);
	const yelStart = angleFor(yelHi),
		yelEnd = angleFor(yelLo);
	const grnStart = angleFor(grnHi),
		grnEnd = angleFor(grnLo);

	const needleAngle = $derived(angleFor(minutesLeft));
	const minutesText = $derived(`${Math.max(0, Math.ceil(minutesLeft))} min`);
</script>

<!-- The dial uses CSS positioning so we can layer multiple SVGs -->
<div class="dial" style={`--size:${size}px; --cx:${cx}; --cy:${cy};`}>
	<!-- Base dial SVG -->
	<svg class="base" width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
		<!-- background track -->
		<path d={describeArc(cx, cy, r, startDeg, endDeg)} stroke="#374151" stroke-width={stroke} fill="none" stroke-linecap="round" />

		<!-- colored segments -->
		<path d={describeArc(cx, cy, r, grnStart, grnEnd)} stroke="#22c55e" stroke-width={stroke} fill="none" stroke-linecap="round" />
		<path d={describeArc(cx, cy, r, yelStart, yelEnd)} stroke="#eab308" stroke-width={stroke} fill="none" stroke-linecap="round" />
		<path d={describeArc(cx, cy, r, redStart, redEnd)} stroke="#ef4444" stroke-width={stroke} fill="none" stroke-linecap="round" />
	</svg>

	<!-- Needle wrapper applies the base rotation via CSS -->
	<div class="needle-wrap" style={`transform: rotate(${needleAngle}deg); transition: ${needleTransition};`}>
		<!-- Separate SVG for the needle so it can have its own animation -->
		<svg class={`needle ${needleClass}`} width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
			<!-- Draw the needle upright; rotation happens on the wrapper -->
			<line x1={cx} y1={cy} x2={cx} y2={cy - (r - 6)} stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
			<circle {cx} {cy} r="5" fill="#ffffff" />
		</svg>
	</div>

	<!-- Center label -->
	<div class="label">{minutesText}</div>
</div>

<style>
	.dial {
		position: relative;
		width: var(--size);
		height: var(--size);
		display: inline-block;
		color: #fff;
	}
	.base {
		position: absolute;
		inset: 0;
		display: block;
	}
	.needle-wrap {
		position: absolute;
		inset: 0;
		transform-origin: 50% 50%;
	}
	.needle {
		position: absolute;
		inset: 0;
		transform-origin: 50% 50%;
		display: block;
	}
	.label {
		position: absolute;
		left: 50%;
		top: calc(50% + 22px);
		transform: translate(-50%, -50%);
		font-size: 16px;
		text-align: center;
		white-space: nowrap;
	}
	@keyframes sweep-in {
		from {
			transform: rotate(-135deg);
		}
		to {
			transform: rotate(0deg);
		}
	}
	.needle.sweep {
		animation: sweep-in 700ms ease-out;
	}
</style>
