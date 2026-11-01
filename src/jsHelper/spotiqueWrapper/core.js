window.Spotique = {
  Player: {
    addEventListener: (type, callback) => {
      if (!(type in Spotique.Player.eventListeners)) {
        Spotique.Player.eventListeners[type] = [];
      }
      Spotique.Player.eventListeners[type].push(callback);
    },
    dispatchEvent: (event) => {
      if (!(event.type in Spotique.Player.eventListeners)) {
        return true;
      }
      const stack = Spotique.Player.eventListeners[event.type];
      for (let i = 0; i < stack.length; i++) {
        if (typeof stack[i] === "function") {
          stack[i](event);
        }
      }
      return !event.defaultPrevented;
    },
    eventListeners: {},
    seek: (p) => {
      const duration = !Number.isInteger(p) && p >= 0 && p <= 1 ? Math.round(p * Spotique.Player.origin._state.duration) : p;
      Spotique.Player.origin.seekTo(duration);
    },
    getProgress: () => {
      const state = Spotique.Player.origin._state;
      return (state.isPaused ? 0 : Date.now() - state.timestamp) + state.positionAsOfTimestamp;
    },
    getProgressPercent: () => {
      const state = Spotique.Player.origin._state;
      return Spotique.Player.getProgress() / state.duration;
    },
    getDuration: () => Spotique.Player.origin._state.duration,
    setVolume: (v) => {
      Spotique.Platform.PlaybackAPI.setVolume(v);
    },
    increaseVolume: () => {
      Spotique.Platform.PlaybackAPI.raiseVolume();
    },
    decreaseVolume: () => {
      Spotique.Platform.PlaybackAPI.lowerVolume();
    },
    getVolume: () => Spotique.Platform.PlaybackAPI._volume,
    next: () => {
      Spotique.Player.origin.skipToNext();
    },
    back: () => {
      Spotique.Player.origin.skipToPrevious();
    },
    togglePlay: () => {
      if (Spotique.Player.isPlaying()) Spotique.Player.pause();
      else Spotique.Player.play();
    },
    isPlaying: () => !Spotique.Player.origin._state.isPaused,
    toggleShuffle: () => {
      Spotique.Player.origin.setShuffle(!Spotique.Player.origin._state.shuffle);
    },
    getShuffle: () => Spotique.Player.origin._state.shuffle,
    setShuffle: (b) => {
      Spotique.Player.origin.setShuffle(b);
    },
    toggleRepeat: () => {
      Spotique.Player.origin.setRepeat((Spotique.Player.origin._state.repeat + 1) % 3);
    },
    getRepeat: () => Spotique.Player.origin._state.repeat,
    setRepeat: (r) => {
      Spotique.Player.origin.setRepeat(r);
    },
    getMute: () => Spotique.Player.getVolume() === 0,
    toggleMute: () => {
      Spotique.Player.setMute(!Spotique.Player.getMute());
    },
    setMute: (b) => {
      if (b !== Spotique.Player.getMute()) {
        document.querySelector(".volume-bar__icon-button")?.click();
      }
    },
    formatTime: (ms) => {
      let seconds = Math.floor(ms / 1e3);
      const minutes = Math.floor(seconds / 60);
      seconds -= minutes * 60;
      return `${minutes}:${seconds > 9 ? "" : "0"}${String(seconds)}`;
    },
    getHeart: () => Spotique.Player.origin._state.item?.metadata["collection.in_collection"] === "true",
    pause: () => {
      Spotique.Player.origin.pause();
    },
    play: () => {
      Spotique.Player.origin.resume();
    },
    playUri: async (uri, context = {}, options = {}) => {
      return await Spotique.Player.origin.play({ uri: uri }, context, options);
    },
    removeEventListener: (type, callback) => {
      if (!(type in Spotique.Player.eventListeners)) return;
      const stack = Spotique.Player.eventListeners[type];
      for (let i = 0; i < stack.length; i++) {
        if (stack[i] === callback) {
          stack.splice(i, 1);
          return;
        }
      }
    },
    skipBack: (amount = 15e3) => {
      Spotique.Player.origin.seekBackward(amount);
    },
    skipForward: (amount = 15e3) => {
      Spotique.Player.origin.seekForward(amount);
    },
    setHeart: (b) => {
      const uris = [Spotique.Player.origin._state.item.uri];
      if (b) {
        Spotique.Platform.LibraryAPI.add({ uris });
      } else {
        Spotique.Platform.LibraryAPI.remove({ uris });
      }
    },
    toggleHeart: () => {
      Spotique.Player.setHeart(!Spotique.Player.getHeart());
    },
  },
  test: () => {
    function checkObject(object) {
      const { objectToCheck, methods, name } = object;
      let count = methods.size;

      for (const method of methods) {
        if (objectToCheck[method] === undefined || objectToCheck[method] === null) {
          console.error(`${name}.${method} is not available. Please open an issue in the Spotique repository to inform us about it.`);
          count--;
        }
      }
      console.log(`${count}/${methods.size} ${name} methods and objects are OK.`);

      for (const key of Object.keys(objectToCheck)) {
        if (!methods.has(key)) {
          console.warn(`${name} method ${key} exists but is not in the method list. Consider adding it.`);
        }
      }
    }

    const objectsToCheck = new Set([
      {
        objectToCheck: Spotique,
        name: "Spotique",
        methods: new Set([
          "Player",
          "addToQueue",
          "CosmosAsync",
          "getAudioData",
          "Keyboard",
          "URI",
          "LocalStorage",
          "Queue",
          "removeFromQueue",
          "showNotification",
          "Menu",
          "ContextMenu",
          "React",
          "Mousetrap",
          "Locale",
          "ReactDOM",
          "Topbar",
          "ReactComponent",
          "PopupModal",
          "SVGIcons",
          "colorExtractor",
          "test",
          "Platform",
          "_platform",
          "Config",
          "expFeatureOverride",
          "createInternalMap",
          "RemoteConfigResolver",
          "Playbar",
          "Tippy",
          "_getStyledClassName",
          "GraphQL",
          "ReactHook",
          "AppTitle",
          "_reservedPanelIds",
          "ReactFlipToolkit",
          "classnames",
          "ReactQuery",
          "Color",
          "extractColorPreset",
          "ReactDOMServer",
          "Snackbar",
          "ContextMenuV2",
          "ReactJSX",
          "_renderNavLinks",
          "Events",
        ]),
      },
      {
        objectToCheck: Spotique.Player,
        name: "Spotique.Player",
        methods: new Set([
          "addEventListener",
          "back",
          "data",
          "decreaseVolume",
          "dispatchEvent",
          "eventListeners",
          "formatTime",
          "getDuration",
          "getHeart",
          "getMute",
          "getProgress",
          "getProgressPercent",
          "getRepeat",
          "getShuffle",
          "getVolume",
          "increaseVolume",
          "isPlaying",
          "next",
          "pause",
          "play",
          "removeEventListener",
          "seek",
          "setMute",
          "setRepeat",
          "setShuffle",
          "setVolume",
          "skipBack",
          "skipForward",
          "toggleHeart",
          "toggleMute",
          "togglePlay",
          "toggleRepeat",
          "toggleShuffle",
          "origin",
          "playUri",
          "setHeart",
        ]),
      },
      {
        objectToCheck: Spotique.ReactComponent,
        name: "Spotique.ReactComponent",
        methods: new Set([
          "RightClickMenu",
          "ContextMenu",
          "Menu",
          "MenuItem",
          "AlbumMenu",
          "PodcastShowMenu",
          "ArtistMenu",
          "PlaylistMenu",
          "TrackMenu",
          "TooltipWrapper",
          "TextComponent",
          "IconComponent",
          "ConfirmDialog",
          "Slider",
          "RemoteConfigProvider",
          "ButtonPrimary",
          "ButtonSecondary",
          "ButtonTertiary",
          "Snackbar",
          "Chip",
          "Toggle",
          "Cards",
          "Router",
          "Routes",
          "Route",
          "StoreProvider",
          "PlatformProvider",
          "Dropdown",
          "MenuSubMenuItem",
          "Navigation",
          "ScrollableContainer",
        ]),
      },
      {
        objectToCheck: Spotique.ReactComponent.Cards,
        name: "Spotique.ReactComponent.Cards",
        methods: new Set([
          "Default",
          "Hero",
          "CardImage",
          "Album",
          "Artist",
          "Audiobook",
          "Episode",
          "Playlist",
          "Profile",
          "Show",
          "Track",
          "FeatureCard",
        ]),
      },
      {
        objectToCheck: Spotique.ReactHook,
        name: "Spotique.ReactHook",
        methods: new Set(["DragHandler", "useExtractedColor"]),
      },
    ]);

    for (const object of objectsToCheck) {
      checkObject(object);
    }
  },
  GraphQL: {
    Definitions: {},
  },
  ReactComponent: {},
  ReactHook: {},
  ReactFlipToolkit: {},
  Snackbar: {},
  Platform: {},
};

// Keep the upstream Marketplace API available on the rebranded client.
window.Spicetify = window.Spotique;
