const { ccclass, property } = cc._decorator;

@ccclass
export default class Goomba extends cc.Component {

    @property moveSpeed: number = 60;
    @property animFps: number = 6;
    @property pointValue: number = 100;

    @property(cc.SpriteFrame)
    walkFrame: cc.SpriteFrame = null;

    @property(cc.SpriteFrame)
    stompedFrame: cc.SpriteFrame = null;

    private rb: cc.RigidBody = null;
    private sprite: cc.Sprite = null;
    private isDead: boolean = false;
    private direction: number = -1;
    private _animTimer: number = 0;
    private _flip: boolean = false;
    private readonly PTM: number = cc.PhysicsManager.PTM_RATIO;

    onLoad() {
        this.rb = this.getComponent(cc.RigidBody);
        if (this.rb) {
            this.rb.enabledContactListener = true;
            (this.rb as any).fixedAngle = true;
        }
        this.sprite = this.getComponent(cc.Sprite);
        if (this.walkFrame && this.sprite) this.sprite.spriteFrame = this.walkFrame;
    }

    update(dt: number) {
        if (this.isDead || !this.rb) return;

        this.rb.linearVelocity = cc.v2(this.direction * this.moveSpeed / this.PTM, this.rb.linearVelocity.y);

        // 走路動畫：左右對稱交替
        this._animTimer += dt;
        if (this._animTimer >= 1 / this.animFps) {
            this._animTimer = 0;
            this._flip = !this._flip;
            this.node.scaleX = this._flip ? Math.abs(this.node.scaleX) : -Math.abs(this.node.scaleX);
        }
    }

    onBeginContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider) {
        if (this.isDead) return;
        const wm = contact.getWorldManifold();
        if (Math.abs(wm.normal.x) > 0.7 && other.node.group === 'ground') {
            this.direction *= -1;
        }
    }

    onEndContact(_c: cc.PhysicsContact, _s: cc.PhysicsCollider, _o: cc.PhysicsCollider) { }

    stomp() {
        if (this.isDead) return;
        this.isDead = true;
        if (this.rb) {
            this.rb.linearVelocity = cc.v2(0, 0);
            this.rb.enabled = false;
        }
        this.node.scaleX = Math.abs(this.node.scaleX);
        if (this.stompedFrame && this.sprite) this.sprite.spriteFrame = this.stompedFrame;
        cc.tween(this.node)
            .to(0.05, { scaleY: 0.2 })
            .delay(0.3)
            .call(() => this.node.destroy())
            .start();
    }
}
