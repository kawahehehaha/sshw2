const { ccclass, property } = cc._decorator;

/**
 * CameraFollow
 * ─────────────────────────────────────────────────────────────────
 * HOW TO USE:
 *   1. In your Game Scene, structure nodes like this:
 *
 *      Canvas
 *      └── GameWorld          ← Attach CameraFollow HERE
 *          ├── Background
 *          ├── Platforms
 *          ├── Player         ← Set as [target]
 *          ├── Enemies
 *          └── QuestionBlocks
 *
 *   2. GameWorld starts at position (0, 0).
 *      CameraFollow moves GameWorld LEFT as player moves RIGHT,
 *      creating the scrolling effect.
 *
 * Properties:
 *   target         → drag Player node here
 *   leftBound      → 0 (don't scroll before level start)
 *   rightBound     → level width in px (e.g. 4000)
 *   smoothSpeed    → camera lag (5 = responsive, 2 = floaty)
 *   followY        → whether camera also follows vertical movement
 */
@ccclass
export default class CameraFollow extends cc.Component {

    @property(cc.Node)
    target: cc.Node = null;

    @property({ tooltip: 'Left scroll limit (px, usually 0)' })
    leftBound: number = 0;

    @property({ tooltip: 'Right scroll limit (px) = level width' })
    rightBound: number = 4000;

    @property({ tooltip: 'Camera smoothing (higher = snappier)' })
    smoothSpeed: number = 8;

    @property({ tooltip: 'Follow player on Y axis too?' })
    followY: boolean = false;

    @property({ tooltip: 'Vertical center offset (positive = camera looks up)' })
    verticalOffset: number = 0;

    // ─── Lifecycle ────────────────────────────────────────
    private screenW: number = 0;
    private screenH: number = 0;
    private initY: number = 0;

    onLoad() {
        this.screenW = cc.winSize.width;
        this.screenH = cc.winSize.height;
        this.initY = this.node.y;
    }

    lateUpdate(dt: number) {
        if (!this.target) return;

        // ── Horizontal follow ──
        // We want player to appear at screen center.
        // GameWorld.x = -(player.localX - screenW/2)
        const targetX = -(this.target.x - this.screenW / 2);

        // Clamp so we don't scroll past level edges
        const minX = -(this.rightBound - this.screenW);
        const maxX = -this.leftBound;
        const clampedX = cc.misc.clampf(targetX, minX, maxX);

        // ── Vertical follow (optional) ──
        let targetY = this.initY;
        if (this.followY) {
            const rawY = -(this.target.y - this.screenH / 2) + this.verticalOffset;
            targetY = rawY; // add clamping if needed
        }

        // ── Smooth interpolation ──
        const newX = cc.misc.lerp(this.node.x, clampedX, dt * this.smoothSpeed);
        const newY = cc.misc.lerp(this.node.y, targetY, dt * this.smoothSpeed);

        this.node.setPosition(newX, newY);
    }
}
