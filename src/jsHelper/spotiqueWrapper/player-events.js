import { waitFor } from "./shared/async.js";

(function waitOrigins() {
  if (!Spotique?.Player?.origin?._state) {
    setTimeout(waitOrigins, 10);
    return;
  }

  const playerState = {
    cache: null,
    current: null,
  };

  const interval = setInterval(() => {
    if (!Spotique.Player.origin._state?.item) return;
    Spotique.Player.data = Spotique.Player.origin._state;
    playerState.cache = Spotique.Player.data;
    clearInterval(interval);
  }, 10);

  Spotique.Player.origin._events.addListener("update", ({ data: playerEventData }) => {
    playerState.current = playerEventData.item ? playerEventData : null;
    Spotique.Player.data = playerState.current;

    if (playerState.cache?.item?.uri !== playerState.current?.item?.uri) {
      const event = new Event("songchange");
      event.data = Spotique.Player.data;
      Spotique.Player.dispatchEvent(event);
    }

    if (playerState.cache?.isPaused !== playerState.current?.isPaused) {
      const event = new Event("onplaypause");
      event.data = Spotique.Player.data;
      Spotique.Player.dispatchEvent(event);
    }

    playerState.cache = playerState.current;
  });

  (function waitProductStateAPI() {
    if (!Spotique.Platform?.UserAPI) {
      setTimeout(waitProductStateAPI, 100);
      return;
    }

    const productState = Spotique.Platform.UserAPI._product_state || Spotique.Platform.UserAPI._product_state_service;
    if (productState) return;

    const productStateApi = Spotique.Platform?.ProductStateAPI?.productStateApi;
    if (!productStateApi) {
      setTimeout(waitProductStateAPI, 100);
      return;
    }

    Spotique.Platform.UserAPI._product_state_service = productStateApi;
  })();

  void (async function setButtonsHeight() {
    const CosmosAsync = await waitFor(() => Spotique.CosmosAsync, 100);
    const expFeatures = JSON.parse(localStorage.getItem("spotique-exp-features") || "{}");
    const isGlobalNavbar = expFeatures?.enableGlobalNavBar?.value;

    if (typeof isGlobalNavbar !== "undefined" && isGlobalNavbar === "control") {
      await CosmosAsync.post("sp://messages/v1/container/control", {
        type: "update_titlebar",
        height: Spotique.Platform.PlatformData.os_name === "osx" ? "42" : "40",
      });
    }
  })();

  setInterval(() => {
    if (playerState.cache?.isPaused === false) {
      const event = new Event("onprogress");
      event.data = Spotique.Player.getProgress();
      Spotique.Player.dispatchEvent(event);
    }
  }, 100);

  Spotique.addToQueue = (uri) => {
    return Spotique.Player.origin._queue?.addToQueue(uri);
  };
  Spotique.removeFromQueue = (uri) => {
    return Spotique.Player.origin._queue?.removeFromQueue(uri);
  };
})();
