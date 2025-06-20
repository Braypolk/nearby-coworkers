<script lang="ts">
	import '../app.css';
	import { dev } from '$app/environment';
	import { injectAnalytics } from '@vercel/analytics/sveltekit'
	import { ModeWatcher } from 'mode-watcher';
	injectAnalytics({ mode: dev ? 'development' : 'production' });

	let { children } = $props();
</script>

<ModeWatcher />
{@render children?.()}
