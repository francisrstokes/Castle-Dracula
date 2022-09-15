import { Tile } from "../engine";
import { blue, noColor } from "../palette";
import { EnemyConfiguration, exampleAI } from "./Enemy";

export const Bat: EnemyConfiguration = {
  description: 'A large, rabid looking bat.',
  name: 'Bat',
  tile: Tile.from('b', blue[7], noColor),
  updateAI: exampleAI,

  hpRange: { min: 3, max: 6 },
  strengthRange: { min: 2, max: 6 },
  acRange: { min: 1, max: 3 },
  speedRange: { min: 0.5, max: 0.75 },
};
