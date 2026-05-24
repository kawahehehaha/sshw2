const { ccclass, property } = cc._decorator;

/**
 * GameManager - Persistent singleton across scenes
 * Attach to an empty node in MainMenu scene
 */
@ccclass
export default class GameManager extends cc.Component {
    private static _inst: GameManager = null;
    public static get inst(): GameManager { return GameManager._inst; }

    // ─── Game State ───────────────────────────────────────
    public lives: number = 3;
    public score: number = 0;
    public currentLevel: number = 1;
    public totalLevels: number = 3;

    // Callback: called when UI needs refresh
    public onScoreChanged: (() => void) | null = null;
    public onLivesChanged: (() => void) | null = null;

    onLoad() {
        if (GameManager._inst) {
            this.node.destroy();
            return;
        }
        GameManager._inst = this;
        cc.game.addPersistRootNode(this.node);
    }

    onDestroy() {
        if (GameManager._inst === this) GameManager._inst = null;
    }

    // ─── Called when player dies ──────────────────────────
    loseLife() {
        this.lives--;
        this.onLivesChanged?.();

        if (this.lives <= 0) {
            this.lives = 0;
            cc.director.loadScene('GameOver');
        } else {
            // Reload current level (respawn at spawn point)
            const sceneName = cc.director.getScene().name;
            cc.director.loadScene(sceneName);
        }
    }

    addScore(pts: number) {
        this.score += pts;
        this.onScoreChanged?.();
    }

    loadLevel(levelIndex: number) {
        this.currentLevel = levelIndex;
        cc.director.loadScene('Level' + levelIndex);
    }

    resetGame() {
        this.lives = 3;
        this.score = 0;
        this.currentLevel = 1;
        cc.director.loadScene('MainMenu');
    }
}
