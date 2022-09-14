import { Game, Layers, Tile, Vector, vFloor, vMul, vScale } from "./engine";
import { Player } from "./Actor/Player";
import { Level } from "./Level";
import { array } from "./util";
import { gridSize, messageArea, pixelScale } from "./ui";
import { gray } from "./palette";

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
window.bridge && window.bridge.setSize(...canvasSize);

console.log(game.renderer)

const playerObj = new Player(game);

const seed = Math.random() * 264574;
const level = new Level(game, seed, playerObj);

game.renderer.setTileSize(canvasSize[1] / gridSize[1]);
game.renderer.setPositionAutoScaling(true);

game.on('update', frame => {
  level.update(frame);
});
game.on('draw', frame => {
  game.renderer.clearBackground(gray[0]);
  level.render(frame);
  renderMessageArea();
});

let changeSize = false;
let multiplier = 0;

game.on('beforeUpdate', () => {
  if (game.input.keyPressed('0')) {
    multiplier = 10;
    changeSize = true;
  }

  if (game.input.keyPressed('1')) {
    multiplier = 14;
    changeSize = true;
  }
});

game.on('frameComplete', () => {
  if (changeSize) {
    changeSize = false;
    const newCanvasSize = vFloor(vScale(multiplier, vMul(gridSize, pixelScale)));
    game.renderer.resizeCanvas(newCanvasSize);
    game.renderer.setTileSize(newCanvasSize[1] / gridSize[1], true);
    window.bridge && window.bridge.setSize(...newCanvasSize);
  }
});

game.start();
