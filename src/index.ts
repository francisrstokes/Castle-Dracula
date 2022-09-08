import { Game, Layers, Tile, Vector, vFloor, vMul, vScale } from "./engine";
import { Player } from "./Player";
import { Level } from "./Level";
import { array } from "./util";
import { gridSize, infoArea, messageArea, pixelScale } from "./ui";
import { allColors, toCssRgba } from "./palette";

const InfoTile = Tile.from('.', [255, 255, 255, 0.1], [200, 200, 200, 0.4]);
const renderInfoArea = () => {
  array(infoArea.dimensions[1], y => array<Vector>(infoArea.dimensions[0], x => [x, y]))
  .flat(1)
  .forEach(v => {
    game.renderer.drawTile(InfoTile, Layers.BG, infoArea.translate(v))
  });
}

const MessageTile = Tile.from('.', [255, 255, 255, 0.1], [200, 200, 200, 0.4]);
const renderMessageArea = () => {
  array(messageArea.dimensions[1], y => array<Vector>(messageArea.dimensions[0], x => [x, y]))
  .flat(1)
  .forEach(v => {
    game.renderer.drawTile(MessageTile, Layers.BG, messageArea.translate(v));
  });
}


const screenMultiplier = 10;
const canvasSize: Vector = vFloor(vScale(screenMultiplier, vMul(gridSize, pixelScale)));
const game = new Game("game-canvas", ...canvasSize);

const playerObj = new Player(game);

const seed = Math.random() * 264574;
const level = new Level(game, seed, playerObj);

game.renderer.setTileSize(canvasSize[1] / gridSize[1]);
game.renderer.setPositionAutoScaling(true);

game.on('update', frame => {
  playerObj.update(frame, level);
  level.update(frame);

  game.input.update();
});
game.on('draw', frame => {
  game.renderer.clearBackground([0, 0, 0, 1]);
  level.render(frame);
  playerObj.render(frame);
  renderInfoArea();
  renderMessageArea();
});

game.start();

// Visualise colour palette
// const el = document.createElement('div');
// el.style.position = 'absolute';
// el.style.top = '0';
// el.style.left = '0';
// el.style.display = 'none';
// document.body.appendChild(el);

// game.renderer.getCanvas().addEventListener('mousedown', () => {
//   el.style.display = 'block';
// });

// game.renderer.getCanvas().addEventListener('mouseup', () => {
//   el.style.display = 'none';
// });

// for (let p of Object.values(allColors)) {
//   const container = document.createElement('div');

//   p.forEach(c => {
//     const e = document.createElement('div');
//     e.style.width = '40px';
//     e.style.height = '40px';
//     e.style.backgroundColor = toCssRgba(c);
//     e.style.display = 'inline-block';
//     container.appendChild(e);
//   });

//   el.appendChild(container);
// }
