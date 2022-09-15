import { EventProvider } from "./EventProvider";

export class Scene<G> extends EventProvider {
  constructor() {
    super(true);
    this.load = this.load.bind(this);
    this.unload = this.unload.bind(this);
    this.update = this.update.bind(this);
    this.draw = this.draw.bind(this);
  }

  load(game: G) {
    this.trigger('load', game);
  }
  unload(game: G) {
    this.trigger('unload', game);
  }
  update(game: G) {
    this.trigger('update', game);
  }
  draw(game: G) {
    this.trigger('draw', game);
  }
}
