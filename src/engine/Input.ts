import { Vector } from "./Vector";

export type KeyState = {
  state: boolean;
  downThisFrame: boolean;
  upThisFrame: boolean;
  lock: boolean;
}

export type MouseState = {
  pressed: boolean;
  downThisFrame: boolean;
  upThisFrame: boolean;
  movedThisFrame: boolean;
  position: Vector;
}

export class Input {
  private keyStates: Record<string, KeyState> = {};
  private mouseState: MouseState = {
    pressed: false,
    downThisFrame: false,
    upThisFrame: false,
    movedThisFrame: false,
    position: [0, 0]
  };
  cleanup: () => void;

  constructor(private canvas: HTMLCanvasElement) {
    const keydownHandler = (e: KeyboardEvent) => {
      if (this.keyStates[e.key] && !this.keyStates[e.key].lock) {
        if (!this.keyStates[e.key]) {
          this.keyStates[e.key] = {
            state: true,
            downThisFrame: true,
            upThisFrame: false,
            lock: true
          };
          return;
        }

        this.keyStates[e.key].lock = true;
        this.keyStates[e.key].state = true;
        this.keyStates[e.key].downThisFrame = true;
      }
    };

    const keyupHandler = (e: KeyboardEvent) => {
      if (!this.keyStates[e.key]) {
        this.keyStates[e.key] = {
          state: false,
          downThisFrame: false,
          upThisFrame: true,
          lock: false
        };
        return;
      }

      this.keyStates[e.key].lock = false;
      this.keyStates[e.key].state = false;
      this.keyStates[e.key].upThisFrame = true;
    };

    const mousedownHandler = (e: MouseEvent) => {
      if (e.button === 0) {
        this.mouseState.pressed = true;
        this.mouseState.downThisFrame = true;
        this.mouseState.upThisFrame = false;
      }
    };

    const mouseupHandler = (e: MouseEvent) => {
      if (e.button === 0) {
        this.mouseState.pressed = false;
        this.mouseState.downThisFrame = false;
        this.mouseState.upThisFrame = true;
      }
    };

    const mousemoveHandler = (e: MouseEvent) => {
      this.mouseState.movedThisFrame = true;
      this.mouseState.position = [e.clientX, e.clientY];
    }

    document.addEventListener('keydown', keydownHandler);
    document.addEventListener('keyup', keyupHandler);

    canvas.addEventListener('mousedown', mousedownHandler);
    canvas.addEventListener('mouseup', mouseupHandler);
    canvas.addEventListener('mousemove', mousemoveHandler);

    this.cleanup = () => {
      document.removeEventListener('keydown', keydownHandler);
      document.removeEventListener('keyup', keyupHandler);
      canvas.removeEventListener('mousedown', mousedownHandler);
      canvas.removeEventListener('mouseup', mouseupHandler);
      canvas.removeEventListener('mousemove', mousemoveHandler);
    };
  }

  keyIsDown(key: string) {
    if (!(key in this.keyStates)) {
      this.keyStates[key] = {
        state: false,
        downThisFrame: false,
        upThisFrame: false,
        lock: false
      };
      return false;
    }
    return this.keyStates[key].state;
  }

  keyPressed(key: string) {
    return this.keyIsDown(key) && this.keyStates[key].downThisFrame;
  }

  keyReleased(key: string) {
    return !this.keyIsDown(key) && this.keyStates[key].upThisFrame;
  }

  mouseIsDown() {
    return this.mouseState.pressed;
  }

  mouseIsUp() {
    return !this.mouseState.pressed;
  }

  mouseClicked() {
    return this.mouseState.downThisFrame;
  }

  mouseReleased() {
    return this.mouseState.upThisFrame;
  }

  mouseMoved() {
    return this.mouseState.movedThisFrame;
  }

  mousePositon() {
    return this.mouseState.position;
  }

  update() {
    Object.values(this.keyStates).forEach(ks => {
      ks.downThisFrame = false;
      ks.upThisFrame = false;
    });
    this.mouseState.downThisFrame = false;
    this.mouseState.upThisFrame = false;
    this.mouseState.movedThisFrame = false;
  }
}
