/// <reference types="react" />

const React = Spotique.React;

class DiscordRPC extends React.Component {
	state = {
		title: "",
		artist: "",
		album: "",
		artwork: "",
		position: 0,
		duration: 0,
	};

	componentDidMount() {
		this.updateTrack();
		Spotique.Player.addEventListener("songchange", this.updateTrack);
		Spotique.Player.addEventListener("onplaypause", this.updateTrack);
		this.progressTimer = setInterval(this.updateTrack, 1000);
	}

	componentWillUnmount() {
		Spotique.Player.removeEventListener("songchange", this.updateTrack);
		Spotique.Player.removeEventListener("onplaypause", this.updateTrack);
		clearInterval(this.progressTimer);
	}

	updateTrack = () => {
		const metadata = Spotique.Player.data?.item?.metadata;
		if (!metadata) {
			this.setState({ title: "", artist: "", album: "", artwork: "", position: 0, duration: 0 });
			return;
		}

		const artistNames = [metadata.artist_name];
		for (let index = 1; metadata[`artist_name:${index}`]; index++) {
			artistNames.push(metadata[`artist_name:${index}`]);
		}
		const image = metadata.image_xlarge_url || metadata.image_url || "";
		const artwork = image.startsWith("spotify:image:")
			? `https://i.scdn.co/image/${image.split(":").pop()}`
			: image;

		this.setState({
			title: metadata.title || "",
			artist: artistNames.filter(Boolean).join(", "),
			album: metadata.album_title || "",
			artwork,
			position: Math.max(0, Number(Spotique.Player.getProgress()) || 0),
			duration: Math.max(0, Number(metadata.duration) || 0),
		});
	};

	render() {
		const { title, artist, album, artwork, position, duration } = this.state;
		const progress = duration ? Math.min((position / duration) * 100, 100) : 0;
		const time = (milliseconds) => {
			const seconds = Math.floor(milliseconds / 1000);
			return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
		};

		return React.createElement(
			"main",
			{
				style: {
					alignItems: "center",
					backdropFilter: "blur(24px)",
					background: "var(--spice-main)",
					borderRadius: "16px",
					boxShadow: "0 16px 48px rgba(0,0,0,.24)",
					color: "var(--spice-text)",
					display: "flex",
					gap: "24px",
					margin: "48px auto",
					maxWidth: "720px",
					padding: "24px",
				},
			},
			artwork
				? React.createElement("img", {
						src: artwork,
						alt: album ? `${album} album art` : "Album art",
						style: { borderRadius: "12px", height: "144px", objectFit: "cover", width: "144px" },
					})
				: null,
			React.createElement(
				"section",
				{ style: { flex: 1, minWidth: 0 } },
				React.createElement("h1", { style: { fontSize: "20px", margin: "0 0 8px" } }, "Discord Rich Presence"),
				React.createElement(
					"p",
					{ style: { margin: "0 0 16px", opacity: 0.72 } },
					"Experimental: Discord may require an authorization flow that is not included in this release."
				),
				React.createElement(
					"strong",
					null,
					title ? `Listening to ${title} with Spotique` : "Nothing is playing"
				),
				artist ? React.createElement("div", { style: { marginTop: "6px", opacity: 0.8 } }, artist) : null,
				duration
					? React.createElement(
							"div",
							{ style: { marginTop: "18px" } },
							React.createElement("div", {
								role: "progressbar",
								"aria-label": "Track progress",
								"aria-valuenow": Math.round(progress),
								"aria-valuemin": 0,
								"aria-valuemax": 100,
								style: {
									background: "rgba(255,255,255,.16)",
									borderRadius: "8px",
									height: "6px",
									overflow: "hidden",
								},
								children: React.createElement("div", {
									style: {
										background: "#5865f2",
										height: "100%",
										transition: "width 500ms linear",
										width: `${progress}%`,
									},
								}),
							}),
							React.createElement(
								"div",
								{ style: { display: "flex", justifyContent: "space-between", marginTop: "6px", opacity: 0.7 } },
								React.createElement("span", null, time(position)),
								React.createElement("span", null, time(duration))
							)
						)
					: null
			)
		);
	}
}

function render() {
	return React.createElement(DiscordRPC);
}
