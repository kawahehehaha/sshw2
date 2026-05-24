const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';

@ccclass
export default class LevelSelectUI extends cc.Component {

    @property([cc.Node])
    levelButtons: cc.Node[] = [];

    @property(cc.Node)
    backButton: cc.Node = null;

    start() {
        this.levelButtons.forEach((btn, i) => {
            btn?.on(cc.Node.EventType.TOUCH_END, () => {
                if (GameManager.inst) {
                    GameManager.inst.currentLevel = i + 1;
                }
                cc.director.loadScene('Level' + (i + 1));
            }, this);
        });

        this.backButton?.on(cc.Node.EventType.TOUCH_END, () => {
            cc.director.loadScene('MainMenu');
        }, this);
    }
}
