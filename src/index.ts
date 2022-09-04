import { Game, Vector, vMul, vScale } from "./engine";
import { Player } from "./Player";
import { Level } from "./Level";

// 16:9
const canvasSize: Vector = vScale(2, [720, 405]);
const game = new Game("game-canvas", ...canvasSize);

const gridSize: Vector = vScale(2, [32*2, 18]);

const playerObj = new Player(game);

const seed = Math.random() * 264574;
const level = new Level(game, seed, gridSize, playerObj);

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
