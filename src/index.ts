import { Game, Vector, vFloor, vMul, vScale } from "./engine";
import { Player } from "./Actor/Player";
import { Level } from "./Level";
import { gridSize, pixelScale } from "./ui";
import { gray } from "./palette";
import { Random } from "./Random";
import { MessageArea } from "./MessageArea";

// @ts-ignore: This is the parcel specific way of getting a static URL
import nova from 'url:../fonts/NovaMono-Regular.ttf';

const main = () => {
  const screenMultiplier = 10;
  const canvasSize: Vector = vFloor(vScale(screenMultiplier, vMul(gridSize, pixelScale)));
  const game = new Game("game-canvas", ...canvasSize);
  window.bridge && window.bridge.setSize(...canvasSize);

  const seed = Math.random() * 264574;
  const random = new Random(seed);

  const playerObj = new Player(game, random);
  const messages = new MessageArea(game);

  const level = new Level(game, random, playerObj, messages);

  game.renderer.setTileSize(canvasSize[1] / gridSize[1]);
  game.renderer.setPositionAutoScaling(true);

  game.on('update', frame => {
    level.update(frame);
  });
  game.on('draw', frame => {
    game.renderer.clearBackground(gray[0]);
    level.render(frame);
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
};

const novaFont = new FontFace('NovaMono', `url(${nova})`);
novaFont.load().then(font => {
  document.fonts.add(font);
  main();
});
