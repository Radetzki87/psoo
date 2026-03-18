export class BaseScreen {
  constructor(bus) {
    this.bus = bus;
    this.container = null;
  }

  mount(container, state) {
    this.container = container;
    container.innerHTML = this.render(state);
    this.bindEvents(container, state);
  }

  update(state) {
    this.mount(this.container, state);
  }

  render(state) {
    return '';
  }

  bindEvents(container, state) {}

  destroy() {
    this.container = null;
  }
}
