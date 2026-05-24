const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';

@ccclass
export default class MainMenuUI extends cc.Component {

    @property(cc.Node)
    startButton: cc.Node = null;

    @property(cc.Node)
    levelSelectButton: cc.Node = null;

    @property(cc.Node)
    titleAnimation: cc.Node = null;

    onLoad() {
        if (this.titleAnimation) {
            cc.tween(this.titleAnimation)
                .repeatForever(
                    cc.tween()
                        .to(0.8, { y: this.titleAnimation.y + 12 }, { easing: 'sineOut' })
                        .to(0.8, { y: this.titleAnimation.y }, { easing: 'sineIn' })
                )
                .start();
        }
    }

    start() {
        this.startButton?.on(cc.Node.EventType.TOUCH_END, this.onStartClick, this);
        this.levelSelectButton?.on(cc.Node.EventType.TOUCH_END, this.onLevelSelectClick, this);
    }

    onStartClick() {
        if (GameManager.inst) {
            GameManager.inst.lives = 3;
            GameManager.inst.score = 0;
            GameManager.inst.currentLevel = 1;
        }
        cc.director.loadScene('Level1');
    }

    onLevelSelectClick() {
        cc.director.loadScene('LevelSelect');
    }
}
