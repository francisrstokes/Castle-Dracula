import { Game, Tile, Vector } from "../engine";
import { Level } from "../Level";
import { Random } from "../Random";
import { Dice, Nullable } from "../util";
import { Weapon } from "../Weapon";

export type StatRange = { min: number, max: number };

export abstract class Actor {
  position: Vector = [2, 2];
  tiles: Tile[][] = [[]];
  dimensions: Vector = [1, 1];
  drawSize = 1;

  name = 'Unknown';

  hp = 100;
  maxHp = 100;
  strength = 1;
  ac = 1;
  speed = 1;
  delay = 1;

  weapon: Nullable<Weapon> = null;
  unarmed: Dice = { base: 0, n: 1, sides: 3 };

  constructor(public game: Game, public random: Random) {}

  collides(actor: Actor) {
    const [ax, ay] = this.position;
    const [aw, ah] = this.dimensions;
    const [bx, by] = actor.position;
    const [bw, bh] = actor.dimensions;

    const axw = ax + aw;
    const ayh = ay + ah;
    const bxw = bx + bw;
    const byh = by + bh;

    return (
         (bx >= ax && bx <= axw)    && (by >= ay && by <= ayh)
      || (bxw >= ax && bxw <= axw)  && (by >= ay && by <= ayh)
      || (bx >= ax && bx <= axw)    && (byh >= ay && byh <= ayh)
      || (bxw >= ax && bxw <= axw)  && (byh >= ay && byh <= ayh)
    );
  }

  getWeaponDamage() {
    if (this.weapon === null) {
      return this.random.diceRoll(this.unarmed);
    }
    return this.random.diceRoll(this.weapon.baseDamage);
  }

  takeDamage(damage: number) {
    this.hp -= damage;
    return this.hp <= 0;
  }

  attack(defender: Actor) {
    // Here we can check various actor effects, evaluate weapons and other items,
    // and figure out the final damage
    const totalAttackStrength = this.strength + this.getWeaponDamage();
    if (totalAttackStrength > defender.ac) {
      const totalDamage = totalAttackStrength - defender.ac;
      const wasFatal = defender.takeDamage(totalDamage);

      if (wasFatal) {
        // TODO: Trigger an event if this was a kill
        console.log(`${this.name} killed ${defender.name} with a fatal blow`);
      } else {
        // TODO: Trigger an event that there was a hit
        console.log(`${this.name} hit ${defender.name} for ${totalDamage} damage`);
      }
    } else {
      // TODO: Trigger an event that this hit did not succeed
      console.log(`${this.name} missed ${defender.name}`);
    }
  }

  abstract render(frame: number): void;
  abstract onBeforeCommit(frame: number): void;
  abstract update(frame: number, currentScene: Level): boolean;
}

