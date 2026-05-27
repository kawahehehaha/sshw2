const { ccclass, property } = cc._decorator;

@ccclass
export default class FlyingGoomba extends cc.Component {

    @property moveSpeed: number = 60;
    @property pointValue: number = 300;
    @property({ tooltip: '上下飄動幅度 (px)' }) bobAmplitude: number = 30;
    @property({ tooltip: '上下飄動速度 (cycles/s)' }) bobSpeed: number = 1.5;
    @property animFps: number = 8;

    @property({ type: [cc.SpriteFrame], tooltip: '0=wing frame1  1=wing frame2' })
    wingFrames: cc.SpriteFrame[] = [];

    @property(cc.SpriteFrame)
    stompedFrame: cc.SpriteFrame = null;

    private rb: cc.RigidBody = null;
    private sprite: cc.Sprite = null;
    private isDead: boolean = false;
    private _animTimer: number = 0;
    private _frameIdx: number = 0;
    private _bobTime: number = 0;
    private readonly PTM: number = cc.PhysicsManager.PTM_RATIO;

    onLoad() {
        this.rb = this.getComponent(cc.RigidBody);
        if (this.rb) {
            this.rb.enabledContactListener = true;
            this.rb.gravityScale = 0;
            (this.rb as any).fixedAngle = true;
        }
        this.sprite = this.getComponent(cc.Sprite);
    }

    update(dt: number) {
        if (this.isDead || !this.rb) return;

        // Left movement + sine-wave vertical bob via velocity
        this._bobTime += dt;
        const omega = this.bobSpeed * Math.PI * 2;
        const bobVy = this.bobAmplitude * omega * Math.cos(omega * this._bobTime);
        this.rb.linearVelocity = cc.v2(-this.moveSpeed / this.PTM, bobVy / this.PTM);

        // Wing flap animation
        if (this.wingFrames.length >= 2 && this.sprite) {
            this._animTimer += dt;
            if (this._animTimer >= 1 / this.animFps) {
                this._animTimer = 0;
                this._frameIdx = (this._frameIdx + 1) % this.wingFrames.length;
                this.sprite.spriteFrame = this.wingFrames[this._frameIdx];
            }
        }
    }

    onBeginContact(_c: cc.PhysicsContact, _s: cc.PhysicsCollider, _o: cc.PhysicsCollider) {}
    onEndContact(_c: cc.PhysicsContact, _s: cc.PhysicsCollider, _o: cc.PhysicsCollider) {}

    stomp() {
        if (this.isDead) return;
        this.isDead = true;
        if (this.rb) {
            this.rb.linearVelocity = cc.v2(0, 0);
            this.rb.gravityScale = 1; // falls to ground after stomped
        }
        if (this.stompedFrame && this.sprite) {
            this.sprite.spriteFrame = this.stompedFrame;
        }
        cc.tween(this.node)
            .to(0.05, { scaleY: 0.2 })
            .delay(0.3)
            .call(() => this.node.destroy())
            .start();
    }
}
