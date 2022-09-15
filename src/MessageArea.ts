import { Game, Layers, Tile } from "./engine";
import { gray, noColor } from "./palette";
import { messageArea } from "./ui";

export enum MessageType {
  Normal = 'Normal'
}

type MessageEntry = {
  type: MessageType;
  message: string;
}

const backgroundTile = Tile.from(' ', noColor, gray[1]);
const textTile = Tile.from('x', gray[7], noColor);

const MESSAGE_LINES = messageArea.dimensions[1];

export class MessageArea {
  private messageBuffer: MessageEntry[] = [];

  constructor(private game: Game) {
  }

  insert(message: string, type = MessageType.Normal) {
    this.messageBuffer.unshift({ type, message });
  }

  render() {
    const {renderer} = this.game;

    // Last 3 messages
    for (let i = 0; i < Math.min(MESSAGE_LINES, this.messageBuffer.length); i++) {
      renderer.drawTile(textTile, Layers.HUD, messageArea.translate([0, i]), {
        char: this.messageBuffer[i].message,
        darken: (i === 0)
          ? 0
          : (i === 1)
            ? 0.25
            : 0.5
      });
    }

    // Background
    for (let y = 0; y < messageArea.dimensions[1]; y++) {
      for (let x = 0; x < messageArea.dimensions[0]; x++) {
        renderer.drawTile(backgroundTile, Layers.HUD, messageArea.translate([x, y]));
      }
    }
  }
}
