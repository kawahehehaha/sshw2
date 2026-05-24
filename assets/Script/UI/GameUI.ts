const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';

/**
 * GameUI (HUD)
 * ─────────────────────────────────────────────────────────────────
 * Attach to a UI node OUTSIDE of GameWorld (so it doesn't scroll).
 * Place directly under Canvas.
 *
 * Scene structure:
 *   Canvas
 *   ├── GameWorld      (scrolls with CameraFollow)
 *   └── HUD            ← GameUI goes here (stays fixed on screen)
 *       ├── LivesLabel (cc.Label)
 *       ├── ScoreLabel (cc.Label)
 *       └── LivesIcons (optional row of heart/mario head sprites)
 */
@ccclass
export default class GameUI extends cc.Component {

    @property(cc.Label)
    livesLabel: cc.Label = null;

    @property(cc.Label)
    scoreLabel: cc.Label = null;

    // Optional: sprite nodes for life icons (hearts / mario heads)
    @property([cc.Node])
    lifeIcons: cc.Node[] = [];

    onLoad() {
        this.refreshUI();

        // Register callbacks for live updates
        if (GameManager.inst) {
            GameManager.inst.onLivesChanged = () => this.refreshUI();
            GameManager.inst.onScoreChanged = () => this.refreshUI();
        }
    }

    refreshUI() {
        const gm = GameManager.inst;
        if (!gm) return;

        if (this.livesLabel) {
            this.livesLabel.string = '× ' + gm.lives;
        }

        if (this.scoreLabel) {
            // Zero-pad score to 6 digits
            this.scoreLabel.string = String(gm.score).padStart(6, '0');
        }

        // Update icon visibility
        this.lifeIcons.forEach((icon, i) => {
            if (icon) icon.active = i < gm.lives;
        });
    }

    onDestroy() {
        if (GameManager.inst) {
            GameManager.inst.onLivesChanged = null;
            GameManager.inst.onScoreChanged = null;
        }
    }
}
