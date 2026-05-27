const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';

// Spin sequence: front → turning → side → turning → front (ping-pong)
// Frame index into idleFrames: 0=front(?), 1=turning, 2=side, 3=turning-back
const SEQ   = [0, 1, 2, 3, 2, 1];
// How long each step shows (seconds). Frame 0 is the long "idle" pause.
const TIMES = [0.85, 0.07, 0.07, 0.07, 0.07, 0.07];

@ccclass
export default class QuestionBlock extends cc.Component {

    @property coinPoints: number = 200;
    @property(cc.Prefab) coinPrefab: cc.Prefab | null = null;
    @property(cc.Prefab) mushroomPrefab: cc.Prefab | null = null;
    @property(cc.AudioClip) spawnSfx: cc.AudioClip | null = null;
    @property(cc.SpriteFrame) disabledFrame: cc.SpriteFrame | null = null;

    @property({ type: [cc.SpriteFrame], tooltip: '依序: 0=正面? 1=轉中 2=側面 3=轉回' })
    idleFrames: cc.SpriteFrame[] = [];

    private isUsed: boolean = false;
    private sprite: cc.Sprite | null = null;
    private originalY: number = 0;
    private _seqIdx: number = 0;
    private _timer: number = 0;

    onLoad() {
        this.sprite = this.getComponent(cc.Sprite);
        this.originalY = this.node.y;
        const rb = this.getComponent(cc.RigidBody);
        if (rb) { rb.enabledContactListener = true; rb.type = cc.RigidBodyType.Static; }
        if (this.idleFrames.length > 0 && this.sprite) {
            this.sprite.spriteFrame = this.idleFrames[0];
        }
    }

    update(dt: number) {
        if (this.isUsed || this.idleFrames.length < 4 || !this.sprite) return;
        this._timer += dt;
        if (this._timer >= TIMES[this._seqIdx]) {
            this._timer -= TIMES[this._seqIdx];
            this._seqIdx = (this._seqIdx + 1) % SEQ.length;
            this.sprite.spriteFrame = this.idleFrames[SEQ[this._seqIdx]];
        }
    }

    onBeginContact(_contact: cc.PhysicsContact, _self: cc.PhysicsCollider, other: cc.PhysicsCollider) {
        if (this.isUsed) return;
        if (other.node.group !== 'player') return;
        const playerWorldY = other.node.convertToWorldSpaceAR(cc.v2(0, 0)).y;
        const blockWorldY  = this.node.convertToWorldSpaceAR(cc.v2(0, 0)).y;
        if (playerWorldY < blockWorldY) this._activate();
    }

    private _activate() {
        this.isUsed = true;
        GameManager.inst?.addScore(100);

        cc.tween(this.node)
            .to(0.08, { y: this.originalY + 12 })
            .to(0.08, { y: this.originalY })
            .call(() => {
                if (this.disabledFrame && this.sprite) this.sprite.spriteFrame = this.disabledFrame;
                else if (this.sprite) this.sprite.node.color = cc.color(120, 120, 120);
            })
            .start();

        if (this.mushroomPrefab) {
            this._spawnMushroom();
        } else if (this.coinPrefab) {
            this._spawnCoin();
        }
    }

    private _spawnMushroom() {
        if (!this.mushroomPrefab) return;
        if (this.spawnSfx) cc.audioEngine.playEffect(this.spawnSfx, false);
        const mushroom = cc.instantiate(this.mushroomPrefab) as cc.Node;
        if (!mushroom) return;
        this.node.parent.addChild(mushroom);
        const startY = this.node.y + this.node.height * 0.5;
        mushroom.setPosition(this.node.x, startY);
        const mc = (mushroom.getComponent('SuperMushroom') || mushroom.getComponentInChildren('SuperMushroom')) as any;
        if (mc) mc.popUp(startY + this.node.height * 2.5);
    }

    private _spawnCoin() {
        if (!this.coinPrefab) return;
        const coin = cc.instantiate(this.coinPrefab) as cc.Node;
        if (!coin) return;
        this.node.parent.addChild(coin);
        coin.setPosition(this.node.x, this.node.y + this.node.height);
        cc.tween(coin).to(0.4, { y: coin.y + 60, opacity: 0 }).call(() => coin.destroy()).start();
    }
}
