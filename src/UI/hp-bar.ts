import { PositionedTile, Tile, vAdd, Vector } from "../engine";
import { gray, noColor, red } from "../palette";
import { array, mapRange } from "../util";

export const hpBar = (hp: number, maxHp: number, barSize = 17, textOffset: Vector = [0, 0]): PositionedTile[] => {
  const FilledTile = Tile.from(' ', gray[7], red[3]);
  const UnfilledTile = Tile.from(' ', gray[7], red[1]);

  const numFilled = Math.floor(mapRange([0, maxHp], [0, barSize+1], hp));
  const percent = Math.floor(mapRange([0, maxHp], [0, 100], hp)).toString();

  const barChars = array(barSize, () => ' ');
  barChars[0] = 'H';
  barChars[1] = 'P';
  for (let pc = percent.length - 1; pc >= 0; pc--) {
    barChars[barSize - 2 - pc] = percent[percent.length - pc - 1];
  }
  barChars[barSize-1] = '%';
  const barText = barChars.join('');

  const barTiles = array<PositionedTile>(barSize, i => ({
    tile: (i < numFilled) ? FilledTile : UnfilledTile,
    position: [i, 0]
  }));

  const textTile: PositionedTile = {
    tile: Tile.from(barText, gray[7], noColor),
    position: textOffset
  };

  return [...barTiles, textTile];
};
