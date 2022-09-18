import { GridTile } from "../Scene";
import { Color } from "./Color";
import { Layers } from "./constants";
import { Tile } from "./Tile";
import { pick } from "./util";
import { Vector, vScale } from "./Vector";
import * as K from 'kandinsky-js';

const pushProps: Array<keyof CanvasRenderingContext2D> = [
  'fillStyle',
  'strokeStyle',
  'font',
  'filter',
  'lineWidth'
];
type StyleStackProps = Pick<CanvasRenderingContext2D,
  | 'fillStyle'
  | 'strokeStyle'
  | 'font'
  | 'filter'
  | 'lineWidth'
>;

export type BufferedDrawingElement = {
  pos: Vector,
  gridPos: Vector,
  char: string,
  color: Color,
  background: Color,
  draw: boolean,
  size: number,
  properties: Record<string, true>
};

export type DrawTileOptions = {
  size?: number,
  scaleToCurrentGridSize?: boolean
  darken?: number;
  char?: string;
  background?: Color;
  color?: Color;
}

const darkenRGBA = ([r, g, b, a]: Color, amount: number): Color => {
  return [...K.darkenRgb(amount, [r, g, b]), a];
};

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private font: string;
  private fontModifier: string;
  private styleStack: Array<StyleStackProps> = [];
  buffers: [
    Array<BufferedDrawingElement>,
    Array<BufferedDrawingElement>,
    Array<BufferedDrawingElement>,
    Array<BufferedDrawingElement>,
  ] = [[],[],[],[]];
  private size: number = 0;

  private shouldClearBackground = false;
  private backgroundClearColor: Color = [0,0,0,0];
  private autoScalePositions = true;

  constructor(canvas: HTMLCanvasElement, canvasWidth: number, canvasHeight: number) {
    canvas.height = canvasHeight;
    canvas.width = canvasWidth;

    this.fontModifier = '';
    this.font = `'NovaMono', 'monospace'`;
    this.ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    this.ctx.textBaseline = 'top';

    this.setTileSize(20);
  }

  private setFillStyle([r, g, b, a]: Color) {
    this.ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
  }

  drawRect(c: Color, [x, y]: Vector, [w, h]: Vector) {
    const oldFill = this.ctx.fillStyle;
    this.setFillStyle(c);
    this.ctx.beginPath();
    this.ctx.fillRect(x, y, w, h);
    this.ctx.fill();
    this.ctx.closePath();
    this.ctx.fillStyle = oldFill;
  }

  drawUnfilledRect([r, g, b, a]: Color, [x, y]: Vector, [w, h]: Vector) {
    this.ctx.strokeStyle = `rgba(${r},${g},${b},${a})`;
    this.ctx.beginPath();
    this.ctx.strokeRect(x, y, w, h);
    this.ctx.stroke();
    this.ctx.closePath();
  }

  drawText([x, y]: Vector, s: string) {
    const xOffset = this.size/2;
    for (let i = 0; i < s.length; i++) {
      this.ctx.fillText(s[i], x + (i * xOffset), y);
    }
  }

  getCanvas() {
    return this.ctx.canvas;
  }

  commit() {
    if (this.shouldClearBackground) {
      this.drawRect(this.backgroundClearColor, [0, 0], [this.ctx.canvas.width, this.ctx.canvas.height]);
      this.shouldClearBackground = false;
    }

    for (const buffer of this.buffers) {
      for (const {pos, color, char, background, draw, size} of buffer) {
        if (draw) {
          // Don't draw for alpha = 0
          if (background[3] !== 0) {
            this.drawRect(background, pos, [size/2, size]);
          }

          this.setTileSize(size);
          this.setFillStyle(color);
          this.drawText(pos, char);
        }
      }
      // Clear the buffer
      buffer.length = 0;
    }
  }

  pushStyle() {
    this.styleStack.push(pick(pushProps, this.ctx));
  }

  popStyle() {
    const popped = this.styleStack.pop();
    if (popped) {
      for (const key of pushProps) {
        (this.ctx as any)[key] = (popped as any)[key];
      }
    }
  }

  setFont(family: string) {
    this.font = `'${family}', 'monospace'`;
  }

  setTileSize(size: number, force = false) {
    if (force || size !== this.size) {
      this.size = size;
      this.ctx.font = `${this.fontModifier} ${this.size}px ${this.font}`;
    }
  }

  resizeCanvas([w, h]: Vector) {
    const canvas = this.getCanvas();
    canvas.width = w;
    canvas.height = h;
    this.ctx.textBaseline = 'top';
  }

  getTileSize() {
    return this.size;
  }

  setPositionAutoScaling(enabled: boolean) {
    this.autoScalePositions = enabled;
  }

  clearBackground(color: Color) {
    this.shouldClearBackground = true;
    this.backgroundClearColor = color;
  }

  drawTile({char, color, properties, background}: Tile, layer: Layers, pos: Vector, opts?: DrawTileOptions) {
    let scaled: Vector = pos;
    if (this.autoScalePositions) {
      if (opts?.size && !(opts?.scaleToCurrentGridSize)) {
        scaled = vScale(opts.size, pos);
      } else {
        scaled = vScale(this.size, pos);
      }
    }
    scaled[0] *= 0.5;

    let bgColor = opts?.background ?? background.slice() as Color;
    let fgColor = opts?.color ?? color.slice() as Color;

    if (opts && opts.darken) {
      bgColor = darkenRGBA(bgColor, opts.darken);
      fgColor = darkenRGBA(fgColor, opts.darken);
    }

    this.buffers[layer].push({
      pos: scaled,
      gridPos: pos,
      char: opts?.char ?? char,
      color: fgColor,
      background: bgColor,
      draw: true,
      size: opts?.size ?? this.size,
      properties
    });
  }


  drawCircle(fill: string, stroke: string, [x, y]: Vector, r: number, strokeWeight = 1) {
    this.pushStyle();
    this.ctx.fillStyle = fill;
    this.ctx.strokeStyle = stroke;
    this.ctx.lineWidth = strokeWeight;

    this.ctx.beginPath();
    this.ctx.ellipse(x, y, r, r, 0, 0, Math.PI*2, false);
    this.ctx.stroke();
    this.ctx.fill();
    this.ctx.closePath();

    this.popStyle();
  }
}
