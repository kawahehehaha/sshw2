const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';

@ccclass
export default class GoalFlag extends cc.Component {

    @property(cc.Node)
    playerNode: cc.Node = null;

    @property(cc.AudioClip)
    clearSfx: cc.AudioClip = null;

    private _triggered: boolean = false;

    update() {
        if (this._triggered || !this.playerNode) return;
        const playerX = this.playerNode.convertToWorldSpaceAR(cc.v2(0, 0)).x;
        const flagX = this.node.convertToWorldSpaceAR(cc.v2(0, 0)).x;
        if (playerX >= flagX - 20) {
            this._triggered = true;
            cc.audioEngine.stopMusic();
            if (this.clearSfx) {
                cc.audioEngine.playEffect(this.clearSfx, false);
            }
            this.scheduleOnce(() => {
                if (GameManager.inst) GameManager.inst.winLevel();
            }, this.clearSfx ? 3 : 0.5);
        }
    }
}
