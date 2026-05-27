const { ccclass, property } = cc._decorator;

@ccclass
export default class GameManager extends cc.Component {
    private static _inst: GameManager = null;
    public static get inst(): GameManager { return GameManager._inst; }

    public lives: number = 3;
    public score: number = 0;
    public currentLevel: number = 1;
    public totalLevels: number = 3;
    public isWin: boolean = false;

    public onScoreChanged: (() => void) | null = null;
    public onLivesChanged: (() => void) | null = null;

    onLoad() {
        if (GameManager._inst) { this.node.destroy(); return; }
        GameManager._inst = this;
        cc.game.addPersistRootNode(this.node);
    }

    onDestroy() {
        if (GameManager._inst === this) GameManager._inst = null;
    }

    loseLife() {
        this.lives--;
        this.onLivesChanged?.();
        if (this.lives <= 0) {
            this.lives = 0;
            this.isWin = false;
            cc.director.loadScene('GameOver');
        } else {
            cc.director.loadScene(cc.director.getScene().name);
        }
    }

    winLevel() {
        this.isWin = true;
        cc.director.loadScene('GameOver');
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