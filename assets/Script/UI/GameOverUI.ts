const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';
import FirebaseManager from '../Managers/FirebaseManager';

@ccclass
export default class GameOverUI extends cc.Component {

    @property(cc.Label)
    titleLabel: cc.Label = null;

    @property(cc.Label)
    finalScoreLabel: cc.Label = null;

    @property(cc.Node)
    retryButton: cc.Node = null;

    @property(cc.Node)
    menuButton: cc.Node = null;

    start() {
        const isWin = GameManager.inst?.isWin ?? false;
        const score = GameManager.inst?.score ?? 0;

        if (this.titleLabel) {
            this.titleLabel.string = isWin ? 'GAME WIN!' : 'GAME OVER';
        }

        if (this.finalScoreLabel) {
            this.finalScoreLabel.string = 'SCORE: ' + String(score).padStart(6, '0');
        }

        FirebaseManager.inst?.submitScore(score);

        this.retryButton?.on(cc.Node.EventType.TOUCH_END, () => {
            if (GameManager.inst) {
                GameManager.inst.isWin = false;
                GameManager.inst.lives = 3;
                GameManager.inst.score = 0;
            }
            cc.director.loadScene('Level1');
        }, this);

        this.menuButton?.on(cc.Node.EventType.TOUCH_END, () => {
            if (GameManager.inst) {
                GameManager.inst.isWin = false;
                GameManager.inst.lives = 3;
                GameManager.inst.score = 0;
            }
            cc.director.loadScene('MainMenu');
        }, this);
    }
}
