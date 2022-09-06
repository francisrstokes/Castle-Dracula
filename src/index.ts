import { Game, Layers, Tile, vAdd, Vector, vFloor, vMul, vScale } from "./engine";
import { Player } from "./Player";
import { Level } from "./Level";
import { array } from "./util";
import { descriptionArea, gridSize, infoArea, messageArea, pixelScale, playArea } from "./ui";

const InfoTile = Tile.from('.', [255, 255, 255, 0.1], [200, 200, 200, 0.4]);
const renderInfoArea = () => {
  array(infoArea.dimensions[1], y => array<Vector>(infoArea.dimensions[0], x => [x, y]))
  .flat(1)
  .forEach(v => {
    game.renderer.drawTile(InfoTile, Layers.BG, infoArea.translate(v))
  });
}

const MessageTile = Tile.from('-', [255, 255, 255, 0.1], [200, 200, 200, 0.4]);
const renderMessageArea = () => {
  array(messageArea.dimensions[1], y => array<Vector>(messageArea.dimensions[0], x => [x, y]))
  .flat(1)
  .forEach(v => {
    game.renderer.drawTile(MessageTile, Layers.BG, messageArea.translate(v))
  });
}

const DescriptionTile = Tile.from('%', [255, 255, 255, 0.1], [200, 200, 200, 0.4]);
const renderDescriptionArea = () => {
  array(descriptionArea.dimensions[1], y => array<Vector>(descriptionArea.dimensions[0], x => [x, y]))
  .flat(1)
  .forEach(v => {
    game.renderer.drawTile(DescriptionTile, Layers.BG, descriptionArea.translate(v))
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
  renderDescriptionArea();
  renderMessageArea();
});

game.start();

const el = document.createElement("div");
document.body.appendChild(el);


game.renderer.getCanvas().addEventListener('mousemove', e => {
  const scaleV: Vector = [1/(game.renderer.getTileSize() * 0.5), 1/game.renderer.getTileSize()];
  const pos = vMul([e.clientX, e.clientY], scaleV);
  pos[0] = Math.floor(pos[0]);
  pos[1] = Math.floor(pos[1]);

  el.innerHTML = `(${pos[0]},${pos[1]})`;
});
