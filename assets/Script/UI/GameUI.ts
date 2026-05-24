const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';

@ccclass
export default class GameUI extends cc.Component {

    @property(cc.Label)
    livesLabel: cc.Label = null;

    @property(cc.Label)
    scoreLabel: cc.Label = null;

    @property([cc.Node])
    lifeIcons: cc.Node[] = [];

    onLoad() {
        this.refreshUI();
        if (GameManager.inst) {
            GameManager.inst.onLivesChanged = () => this.refreshUI();
            GameManager.inst.onScoreChanged = () => this.refreshUI();
        }
    }

    refreshUI() {
        const gm = GameManager.inst;
        if (!gm) return;
        if (this.livesLabel) this.livesLabel.string = '× ' + gm.lives;
        if (this.scoreLabel) this.scoreLabel.string = String(gm.score).padStart(6, '0');
        this.lifeIcons.forEach((icon, i) => { if (icon) icon.active = i < gm.lives; });
    }

    onDestroy() {
        if (GameManager.inst) {
            GameManager.inst.onLivesChanged = null;
            GameManager.inst.onScoreChanged = null;
        }
    }
}