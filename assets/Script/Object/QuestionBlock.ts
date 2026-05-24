const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';

@ccclass
export default class QuestionBlock extends cc.Component {

    @property coinPoints: number = 200;
    @property(cc.Prefab) coinPrefab: cc.Prefab = null;
    @property(cc.SpriteFrame) usedFrame: cc.SpriteFrame = null;
    @property(cc.SpriteFrame) activeFrame: cc.SpriteFrame = null;

    private isUsed: boolean = false;
    private sprite: cc.Sprite = null;
    private originalY: number = 0;

    onLoad() {
        this.sprite = this.getComponent(cc.Sprite);
        this.originalY = this.node.y;
        const rb = this.getComponent(cc.RigidBody);
        if (rb) { rb.enabledContactListener = true; rb.type = cc.RigidBodyType.Static; }
        if (this.activeFrame && this.sprite) this.sprite.spriteFrame = this.activeFrame;
    }

    onBeginContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider) {
        if (this.isUsed) return;
        if (other.node.group !== 'player') return;
        const playerWorldY = other.node.convertToWorldSpaceAR(cc.v2(0, 0)).y;
        const blockWorldY = this.node.convertToWorldSpaceAR(cc.v2(0, 0)).y;
        if (playerWorldY < blockWorldY) this._activate();
    }

    private _activate() {
        this.isUsed = true;
        GameManager.inst?.addScore(this.coinPoints);
        cc.tween(this.node)
            .to(0.08, { y: this.originalY + 12 })
            .to(0.08, { y: this.originalY })
            .start();
        if (this.coinPrefab) {
            const coin = cc.instantiate(this.coinPrefab);
            this.node.parent.addChild(coin);
            coin.setPosition(this.node.x, this.node.y + this.node.height);
            cc.tween(coin).to(0.4, { y: coin.y + 60, opacity: 0 }).call(() => coin.destroy()).start();
        }
        this.scheduleOnce(() => {
            if (this.usedFrame && this.sprite) this.sprite.spriteFrame = this.usedFrame;
            else if (this.sprite) this.sprite.node.color = cc.color(120, 120, 120);
        }, 0.16);
    }
}