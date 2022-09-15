import { Actor } from "../Actor";
import { Level } from "../Level";
import { Dice } from "../util";

export type WeaponEffectFn = (self: Weapon, attacker: Actor, defender: Actor, level: Level) => number;

export type WeaponStatBonus = {
  hp: number;
  strength: number;
  ac: number;
  speed: number;
};

export enum WeaponStatus {
  Cursed = 'Cursed',
  Normal = 'Normal',
  Blessed = 'Blessed',
};

export enum WeaponProperty {
  Something = 'Something'
}

export type WeaponConfig = {
  name: string;
  description: string;
  effectFn: WeaponEffectFn;
  baseDamage: Dice;
  properties: Array<WeaponProperty>;
};

export class Weapon {
  name: string;
  description: string;
  effectFn: WeaponEffectFn;
  baseDamage: Dice;
  properties: Record<string, true> = {};

  constructor(config: WeaponConfig) {
    this.name = config.name;
    this.description = config.description;
    this.effectFn = config.effectFn;
    this.baseDamage = config.baseDamage;

    for (const prop of config.properties) {
      this.addProperty(prop);
    }
  }

  addProperty(prop: WeaponProperty) {
    this.properties[prop] = true;
  }

  hasProperty(prop: WeaponProperty) {
    return prop in this.properties;
  }
}

