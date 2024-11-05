import { clearElementsForLocalStorage } from "../../packages/excalidraw/element";
import {
  clearAppStateForLocalStorage,
  getDefaultAppState,
} from "../../packages/excalidraw/appState";
import type { ExcalidrawElement } from "../../packages/excalidraw/element/types";
import type { AppState, BinaryFiles } from "../../packages/excalidraw/types";
import { exportToSvg } from "../../packages/excalidraw/scene/export";
import { getNonDeletedElements } from "../../packages/excalidraw/element";
import { Emitter } from "./tools";
import { debounce } from "../../packages/excalidraw/utils";

export default class Bridge {
  status: string = "start";
  emitter: Emitter = new Emitter();
  content: any;

  constructor() {
    window.addEventListener("message", this.handleMessage);
  }

  handleMessage = (event: any) => {
    const message = event.data;

    if (message.topic === "res loaddata") {
      this.content = message.data;
      this.emitter.emit("load");
    } else if (message.topic === "res load error") {
      this.emitter.emit("load error");
    } else if (message.topic === "req savedata") {
      this.sendData();
    }
  };

  sendMessage = (message: any) => {
    try {
      window.parent.postMessage(message, window.document.referrer);
    } catch (e) {
      console.error(e);
    }
  };

  async load() {
    this.sendMessage({ topic: "req loaddata" });
  }

  getLocalDataState() {
    const content = this.content;
    return elementAndStatefromData(
      content && content.elements,
      content && content.appState,
    );
  }

  private elements?: readonly ExcalidrawElement[];
  private appState?: AppState;
  private files?: BinaryFiles;

  stageForSave = (
    elements: readonly ExcalidrawElement[],
    state: AppState,
    files: BinaryFiles,
  ) => {
    if (!this.elements) {
      this.sendMessage({ topic: "staged" });
    }
    this.elements = elements;
    this.appState = state;
    this.files = files;
  };

  stageForSaveDebounce = debounce(this.stageForSave, 200);
  async save() {
    this.sendData();
  }

  async getSaveData() {
    const svgEl = await exportToSvg(
      getNonDeletedElements(this.elements! || []),
      {
        exportBackground: false,
        viewBackgroundColor: this.appState!.viewBackgroundColor,
      },
      this.files || null,
    );

    const content = {
      elements: JSON.stringify(clearElementsForLocalStorage(this.elements!)),
      appState: JSON.stringify({
        viewBackgroundColor: this.appState!.viewBackgroundColor,
      }),
      files: this.files,
      svg: new XMLSerializer().serializeToString(svgEl),
    };
    return content;
  }

  async sendData() {
    this.sendMessage({ topic: "res savedata", data: await this.getSaveData() });
  }

  async cancel() {
    this.sendMessage({ topic: "req cancel" });
  }
}

export const elementAndStatefromData = (
  savedElements?: any,
  savedState?: any,
) => {
  let elements: ExcalidrawElement[] = [];
  let appState = null;

  if (savedElements) {
    elements = clearElementsForLocalStorage(JSON.parse(savedElements));
  }
  if (savedState) {
    appState = {
      ...getDefaultAppState(),
      ...clearAppStateForLocalStorage(
        JSON.parse(savedState) as Partial<AppState>,
      ),
    };
  }
  return { elements, appState };
};
