import { Actor } from "./Actor"

export enum GameEvent {
  ActorHit = 'ActorHit',
  ActorMissed = 'ActorMissed',
  ActorKilled = 'ActorKilled',
}

export type GameEventData = {
  [GameEvent.ActorHit]: {
    attacker: Actor;
    defender: Actor;
    damage: number;
  }

  [GameEvent.ActorMissed]: {
    attacker: Actor;
    defender: Actor;
  }

  [GameEvent.ActorKilled]: {
    attacker: Actor;
    defender: Actor;
  }
}
