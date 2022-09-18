import {Color} from './Color'
import { Vector } from './Vector';

export type PositionedTile = {
  tile: Tile;
  position: Vector;
};

export class Tile {
  _char: string;
  _color: Color;
  _background: Color;
  properties: Record<string, true> = {};

  constructor(char: string, color: Color, background?: Color) {
    this._char = char;
    this._color = color;
    this._background = background ?? [0, 0, 0, 0];
  }

  get color() { return this._color; }
  get char() { return this._char; }
  get background() { return this._background; }

  set color(value) { this._color = value; }
  set char(value) { this._char = value; }
  set background(value) { this._background = value; }

  hasProperty(prop: string) {
    return prop in this.properties;
  }

  addProperty(prop: string) {
    this.properties[prop] = true;
    return this;
  }

  addProperties(props: string[]) {
    props.forEach(prop => {
      this.properties[prop] = true;
    })
    return this;
  }

  removeProperty(prop: string) {
    delete this.properties[prop];
  }

  static from(char: string, color: Color, background?: Color) {
    return new Tile(char, color, background);
  }
}
