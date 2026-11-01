// NAME: Spotique Discord Rich Presence
// AUTHOR: Spotique
// DESCRIPTION: Share the currently playing track with Discord Rich Presence.

(function DiscordRichPresence() {
	const bridgeUrl = "ws://127.0.0.1:17342/activity";
	let connection;
	let reconnectTimer;
	let progressTimer;
	let lastSentAt = 0;
	let closed = false;

	function connect() {
		if (closed || connection?.readyState === WebSocket.CONNECTING || connection?.readyState === WebSocket.OPEN) return;

		connection = new WebSocket(bridgeUrl);
		connection.addEventListener("open", sendUpdate);
		connection.addEventListener("message", ({ data }) => {
			try {
				const result = JSON.parse(data);
				if (!result.ok) console.warn("Spotique Discord Rich Presence:", result.error);
			} catch (error) {
				console.error("Could not read the Spotique Discord Rich Presence response", error);
			}
		});
		connection.addEventListener("error", () => connection.close());
		connection.addEventListener("close", () => {
			connection = null;
			if (!closed) reconnectTimer = setTimeout(connect, 5000);
		});
	}

	function getArtwork(metadata) {
		const image = metadata.image_xlarge_url || metadata.image_url || "";
		if (image.startsWith("https://i.scdn.co/")) return image;
		if (image.startsWith("spotify:image:")) return `https://i.scdn.co/image/${image.split(":").pop()}`;
		return "";
	}

	function sendUpdate(force = false) {
		if (connection?.readyState !== WebSocket.OPEN) {
			connect();
			return;
		}

		const now = Date.now();
		if (!force && now - lastSentAt < 10000) return;
		lastSentAt = now;

		const item = Spotique.Player.data?.item;
		const metadata = item?.metadata;
		if (!metadata) {
			connection.send(JSON.stringify({ title: "" }));
			return;
		}

		const artists = [metadata.artist_name];
		for (let index = 1; metadata[`artist_name:${index}`]; index++) {
			artists.push(metadata[`artist_name:${index}`]);
		}
		connection.send(
			JSON.stringify({
				title: metadata.title || "",
				artist: artists.filter(Boolean).join(", "),
				album: metadata.album_title || "",
				artwork: getArtwork(metadata),
				positionMs: Math.max(0, Number(Spotique.Player.getProgress()) || 0),
				durationMs: Math.max(0, Number(metadata.duration) || 0),
				playing: Spotique.Player.isPlaying(),
			})
		);
	}

	function waitForPlayer() {
		if (!Spotique.Player?.addEventListener || !Spotique.Player?.data) {
			setTimeout(waitForPlayer, 500);
			return;
		}

		connect();
		Spotique.Player.addEventListener("songchange", () => sendUpdate(true));
		Spotique.Player.addEventListener("onplaypause", () => sendUpdate(true));
		Spotique.Player.addEventListener("onprogress", () => sendUpdate());
		progressTimer = setInterval(sendUpdate, 10000);
		sendUpdate(true);
	}

	window.addEventListener(
		"beforeunload",
		() => {
			closed = true;
			clearTimeout(reconnectTimer);
			clearInterval(progressTimer);
			if (connection?.readyState === WebSocket.OPEN) {
				connection.send(JSON.stringify({ title: "" }));
				connection.close();
			}
		},
		{ once: true }
	);

	waitForPlayer();
})();
