import {Color} from './Color'

export class Tile {
  char: string;
  color: Color;
  background: Color;
  properties: Record<string, true> = {};

  constructor(char: string, color: Color, background?: Color) {
    this.char = char;
    this.color = color;
    this.background = background ?? [0, 0, 0, 0];
  }

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
