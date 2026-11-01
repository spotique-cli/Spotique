import { refreshNavLinks } from "./custom-apps.js";
import { waitFor } from "./shared/async.js";
import { exposeReactComponentsUI } from "./webpack/component-resolvers.js";
import { waitForLateComponents } from "./webpack/late-components.js";
import { getModuleInventory, groupBy } from "./webpack/module-inventory.js";
import { exposeRuntimeResolvers } from "./webpack/runtime-resolvers.js";
import { createScrollableContainer } from "./webpack/scrollable-container.js";
import { createSpotiqueBindings, findReact, findReactFromWebpack } from "./webpack/spotique-bindings.js";
import { waitForURI } from "./webpack/uri.js";

void (async function hotloadWebpackModules() {
  const getChunkQueue = () => window?.rspackChunk || window?.rspackChunkclient_web || window?.webpackChunkclient_web;
  let chunkQueue = getChunkQueue();
  if (!chunkQueue) chunkQueue = await waitFor(getChunkQueue, 50);

  // Force all webpack modules to load
  const require = chunkQueue.push([[Symbol()], {}, (re) => re]);
  if (!require.m) await waitFor(() => require.m, 50);
  console.log("[spotiqueWrapper] Waiting for required webpack modules to load");
  let webpackDidCallback = false;
  // https://github.com/webpack/webpack/blob/main/lib/runtime/OnChunksLoadedRuntimeModule.js
  require.O(
    null,
    [],
    () => {
      webpackDidCallback = true;
    },
    1,
  );

  Spotique.React = findReactFromWebpack(require);

  await waitFor(() => webpackDidCallback, 100);
  console.log("[spotiqueWrapper] All required webpack modules loaded");
  const inventory = getModuleInventory(require);
  const chunks = inventory.chunks;
  const cache = inventory.cache;
  Spotique.React = findReact(cache);
  Spotique.Events.platformLoaded.fire();

  const { modules, functionModules } = inventory;
  const exportedReactObjects = groupBy(modules.filter(Boolean), (x) => x.$$typeof);
  const exportedMemos = exportedReactObjects[Symbol.for("react.memo")] ?? [];
  const exportedForwardRefs = exportedReactObjects[Symbol.for("react.forward_ref")] ?? [];
  const exportedMemoFRefs = exportedMemos.filter((m) => m.type.$$typeof === Symbol.for("react.forward_ref"));
  const reactComponentsUI = exposeReactComponentsUI({ modules, functionModules, exportedForwardRefs, exportedMemoFRefs });

  Object.assign(
    Spotique,
    createSpotiqueBindings({
      cache,
      chunks,
      modules,
      functionModules,
      require,
      exportedMemos,
      exportedMemoFRefs,
      reactComponentsUI,
      scrollableContainer: createScrollableContainer(),
    }),
  );

  if (!Spotique.ContextMenuV2._context) Spotique.ContextMenuV2._context = Spotique.React.createContext({});

  waitForLateComponents({ require, refreshNavLinks });

  exposeRuntimeResolvers({ cache, chunks, modules, functionModules, require });

  waitForURI({ cache, modules, functionModules });

  Spotique.Events.webpackLoaded.fire();
  refreshNavLinks?.();
})();
