// NAME: Christian Spotify
// AUTHOR: khanhas
// DESCRIPTION: Auto skip explicit songs. Toggle in Profile menu.

/// <reference path="../globals.d.ts" />

(async function ChristianSpotify() {
	if (!Spotique.LocalStorage) {
		setTimeout(ChristianSpotify, 1000);
		return;
	}
	await new Promise((res) => Spotique.Events.webpackLoaded.on(res));

	let isEnabled = Spotique.LocalStorage.get("ChristianMode") === "1";

	new Spotique.Menu.Item("Christian mode", isEnabled, (self) => {
		isEnabled = !isEnabled;
		Spotique.LocalStorage.set("ChristianMode", isEnabled ? "1" : "0");
		self.setState(isEnabled);
	}).register();

	Spotique.Player.addEventListener("songchange", () => {
		if (!isEnabled) return;
		const data = Spotique.Player.data || Spotique.Queue;
		if (!data) return;

		const isExplicit = data.item.metadata.is_explicit;
		if (isExplicit === "true") {
			Spotique.Player.next();
		}
	});
})();
