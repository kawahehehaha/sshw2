const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';
import FirebaseManager from '../Managers/FirebaseManager';

@ccclass
export default class MainMenuUI extends cc.Component {

    @property(cc.Node)
    startButton: cc.Node = null;

    @property(cc.Node)
    levelSelectButton: cc.Node = null;

    @property(cc.Node)
    leaderboardButton: cc.Node = null;

    @property(cc.Node)
    logoutButton: cc.Node = null;

    @property(cc.Node)
    loginButton: cc.Node = null;

    @property(cc.Label)
    userLabel: cc.Label = null;

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

    async start() {
        this.startButton?.on(cc.Node.EventType.TOUCH_END, this.onStartClick, this);
        this.levelSelectButton?.on(cc.Node.EventType.TOUCH_END, this.onLevelSelectClick, this);
        this.leaderboardButton?.on(cc.Node.EventType.TOUCH_END, () => {
            cc.director.loadScene('Leaderboard');
        }, this);
        this.logoutButton?.on(cc.Node.EventType.TOUCH_END, async () => {
            await FirebaseManager.inst?.signOut();
            cc.director.loadScene('Login');
        }, this);
        this.loginButton?.on(cc.Node.EventType.TOUCH_END, () => {
            cc.director.loadScene('Login');
        }, this);

        await FirebaseManager.inst?.ready;
        this._updateUserUI();
    }

    private _updateUserUI() {
        const loggedIn = FirebaseManager.inst?.isLoggedIn ?? false;
        if (this.userLabel) {
            this.userLabel.string = loggedIn ? FirebaseManager.inst.displayName : '訪客';
        }
        if (this.logoutButton) this.logoutButton.active = loggedIn;
        if (this.loginButton) this.loginButton.active = !loggedIn;
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
