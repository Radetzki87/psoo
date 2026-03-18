import { TitleScreen } from './screens/title-screen.js';
import { DiscoveryScreen } from './screens/discovery-screen.js';
import { SceneScreen } from './screens/scene-screen.js';
import { CharacterScreen } from './screens/character-screen.js';
import { CatchScreen } from './screens/catch-screen.js';
import { AccusationScreen } from './screens/accusation-screen.js';
import { ResultScreen } from './screens/result-screen.js';
import { NotebookScreen } from './screens/notebook-screen.js';

export class Renderer {
  constructor(appElement, bus) {
    this.app = appElement;
    this.bus = bus;
    this.currentScreen = null;
    this.notebookOpen = false;
    this.notebookScreen = new NotebookScreen(bus);

    this.screens = {
      TITLE: new TitleScreen(bus),
      DISCOVERY: new DiscoveryScreen(bus),
      INVESTIGATE: new SceneScreen(bus),
      QUESTION: new CharacterScreen(bus),
      CATCH: new CatchScreen(bus),
      ACCUSE: new AccusationScreen(bus),
      RESULT_WIN: new ResultScreen(bus),
      RESULT_LOSE: new ResultScreen(bus)
    };
  }

  render(state) {
    const phase = state.phase;
    const screen = this.screens[phase];

    if (!screen) {
      this.app.innerHTML = `<div class="screen"><p>알 수 없는 상태: ${phase}</p></div>`;
      return;
    }

    // 화면 전환 시 페이드 효과
    if (this.currentScreen !== screen) {
      this.app.classList.add('screen-transition');
      this.currentScreen = screen;
      setTimeout(() => this.app.classList.remove('screen-transition'), 300);
    }

    screen.mount(this.app, state);

    // 수첩 오버레이
    if (this.notebookOpen) {
      this._showNotebook(state);
    }
  }

  showNotebook(state) {
    this.notebookOpen = true;
    this._showNotebook(state);
  }

  hideNotebook() {
    this.notebookOpen = false;
    const overlay = document.querySelector('.notebook-overlay');
    if (overlay) overlay.remove();
  }

  _showNotebook(state) {
    let overlay = document.querySelector('.notebook-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      document.body.appendChild(overlay);
    }
    this.notebookScreen.mount(overlay, state);
  }
}
