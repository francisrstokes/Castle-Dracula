export enum Layers { BG, MG, FG, HUD };

export enum Lifecycle {
  BEFORE_UPDATE   = '@@FRAME_BEFORE_UPDATE',
  BEFORE_DRAW     = '@@FRAME_BEFORE_DRAW',
  BEFORE_COMMIT   = '@@FRAME_BEFORE_RENDER_COMMIT',
  FRAME_COMPLETE  = '@@FRAME_COMPLETE'
};
