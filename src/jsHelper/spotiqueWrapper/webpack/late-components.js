import { fnStr } from "../shared/string.js";
import { cardName, cardTypes, findBaseCards, findCards } from "./cards.js";
import { findDropdownComponent, wrapProvider } from "./component-resolvers.js";
import { createModuleInventoryScanner } from "./module-inventory.js";

const cardComponentNames = ["FeatureCard", "Hero", "CardImage", ...cardTypes.map(cardName)];
const LATE_COMPONENTS = ["Slider", "Dropdown", "Toggle", ...cardComponentNames.map((name) => `Cards.${name}`)];

function hasComponent(component) {
  return component.split(".").reduce((owner, key) => owner?.[key], Spotique.ReactComponent) !== undefined;
}

function hasLateComponents() {
  return LATE_COMPONENTS.every(hasComponent);
}

export function waitForLateComponents({ require, refreshNavLinks }) {
  const inventory = createModuleInventoryScanner();

  (function waitForChunks(attempt = 0) {
    if (hasLateComponents()) return;

    const { chunks: newChunks, modules: newModules, functionModules: newFunctionModules } = inventory.scan(require);

    const cardInventory = { modules: newModules, functionModules: newFunctionModules };
    const remainingCardTypes = cardTypes.filter((type) => Spotique.ReactComponent.Cards[cardName(type)] === undefined);
    const discoveredCards = {
      ...findBaseCards(cardInventory),
      ...Object.fromEntries(findCards(cardInventory, remainingCardTypes)),
    };
    for (const [name, component] of Object.entries(discoveredCards))
      if (Spotique.ReactComponent.Cards[name] === undefined) Spotique.ReactComponent.Cards[name] = component;

    if (!Spotique.ReactComponent.Slider)
      Spotique.ReactComponent.Slider = wrapProvider(newFunctionModules.find((m) => fnStr(m).includes("progressBarRef")));
    if (!Spotique.ReactComponent.Toggle)
      Spotique.ReactComponent.Toggle = newFunctionModules.find((m) => fnStr(m).includes("onSelected") && fnStr(m).includes('type:"checkbox"'));
    if (!Spotique.ReactComponent.Dropdown)
      Spotique.ReactComponent.Dropdown = findDropdownComponent({ modules: newModules, chunks: newChunks, require });
    if (!Spotique.ReactComponent.Toggle) {
      const toggleChunk = newChunks.find(([, value]) => fnStr(value).includes("onSelected") && fnStr(value).includes('type:"checkbox"'));
      if (toggleChunk) {
        Spotique.ReactComponent.Toggle = Object.values(require(toggleChunk[0]))[0].render;
      }
    }

    if (!hasLateComponents()) {
      setTimeout(() => waitForChunks(attempt + 1), Math.min(100 * 2 ** Math.min(attempt, 4), 1000));
      return;
    }

    if (Spotique.ReactComponent.ScrollableContainer) setTimeout(() => refreshNavLinks?.(), 100);
  })();
}
