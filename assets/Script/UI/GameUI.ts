const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';

@ccclass
export default class GameUI extends cc.Component {

    @property(cc.Label) livesLabel: cc.Label = null;
    @property(cc.Label) scoreLabel: cc.Label = null;
    @property(cc.Label) timerLabel: cc.Label = null;

    @property(cc.AudioClip)
    bgm: cc.AudioClip | null = null;

    @property timeLimit: number = 180;

    private _timeLeft: number = 0;
    private _ticking: boolean = true;

    onLoad() {
        this._timeLeft = this.timeLimit;
        if (this.bgm) { const clip = this.bgm; this.scheduleOnce(() => cc.audioEngine.playMusic(clip, true), 1.25); }

        // 延遲一幀執行，確保 GameManager 已經準備好
        this.scheduleOnce(() => {
            this.refreshUI();
            if (GameManager.inst) {
                // 每次載入時，重新綁定最新的 UI 更新函數
                GameManager.inst.onLivesChanged = () => this.refreshUI();
                GameManager.inst.onScoreChanged = () => this.refreshUI();
            }
        }, 0);
    }

    update(dt: number) {
        if (!this._ticking) return;
        this._timeLeft -= dt;
        if (this._timeLeft <= 0) {
            this._timeLeft = 0;
            this._ticking = false;
            if (GameManager.inst) GameManager.inst.loseLife();
        }

        if (this.timerLabel) {
            // 只顯示數字，不顯示 TIME
            this.timerLabel.string = Math.ceil(this._timeLeft).toString().padStart(3, '0');
            this.timerLabel.node.color = this._timeLeft <= 30
                ? cc.color(255, 60, 60)
                : cc.color(255, 255, 255);
        }
    }

    refreshUI() {
        const gm = GameManager.inst;
        if (!gm) return;
        if (this.livesLabel) this.livesLabel.string = String(gm.lives);
        if (this.scoreLabel) this.scoreLabel.string = String(gm.score).padStart(6, '0');
    }

    stopTimer() {
        this._ticking = false;
    }

    // 🚨 移除了原本 onDestroy 裡設為 null 的寫法，避免誤殺新場景的綁定
}