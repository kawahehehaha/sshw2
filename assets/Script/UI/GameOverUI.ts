const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';

@ccclass
export default class GameOverUI extends cc.Component {

    @property(cc.Label)
    finalScoreLabel: cc.Label = null;

    @property(cc.Node)
    retryButton: cc.Node = null;

    @property(cc.Node)
    menuButton: cc.Node = null;

    start() {
        if (this.finalScoreLabel && GameManager.inst) {
            this.finalScoreLabel.string = 'SCORE: ' + String(GameManager.inst.score).padStart(6, '0');
        }

        this.retryButton?.on(cc.Node.EventType.TOUCH_END, () => {
            if (GameManager.inst) {
                GameManager.inst.lives = 3;
                GameManager.inst.score = 0;
            }
            cc.director.loadScene('Level1');
        }, this);

        this.menuButton?.on(cc.Node.EventType.TOUCH_END, () => {
            if (GameManager.inst) {
                GameManager.inst.lives = 3;
                GameManager.inst.score = 0;
            }
            cc.director.loadScene('MainMenu');
        }, this);
    }
}
