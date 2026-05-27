const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';

@ccclass
export default class PlayerController extends cc.Component {

    @property moveSpeed: number = 2000;
    @property jumpSpeed: number = 800;
    @property fallDeathY: number = -400;
    @property invincibleDuration: number = 2.0;

    @property(cc.SpriteAtlas)
    smallAtlas: cc.SpriteAtlas | null = null;

    @property(cc.SpriteAtlas)
    bigAtlas: cc.SpriteAtlas | null = null;

    // ── 動畫 frame 名稱，如果播錯了直接在這裡改 ──
    private readonly ANIM_IDLE  = 'mario_small_0';
    private readonly ANIM_WALK  = ['mario_small_1', 'mario_small_2', 'mario_small_3'];
    private readonly ANIM_JUMP  = 'mario_small_4';
    private readonly WALK_FPS   = 8;

    private rb: cc.RigidBody = null;
    private sprite: cc.Sprite | null = null;
    private isDead: boolean = false;
    private isInvincible: boolean = false;
    private isBig: boolean = false;

    private leftDown: boolean = false;
    private rightDown: boolean = false;

    private activeGroundContacts: Set<cc.PhysicsContact> = new Set();
    private _groundCountRaw: number = 0;
    private _coyoteTimer: number = 0;
    private readonly COYOTE: number = 0.1;

    private _walkTimer: number = 0;
    private _walkIdx: number = 0;

    private get isOnGround(): boolean {
        return this._groundCountRaw > 0 || this._coyoteTimer > 0;
    }

    private readonly PTM: number = cc.PhysicsManager.PTM_RATIO;

    onLoad() {
        cc.director.getPhysicsManager().enabled = true;
        this.rb = this.getComponent(cc.RigidBody);
        if (!this.rb) { cc.error('PlayerController: no RigidBody!'); return; }
        this.rb.fixedAngle = true;
        this.rb.enabledContactListener = true;
        const col = this.getComponent(cc.PhysicsBoxCollider);
        if (col) { col.friction = 0; col.apply(); }

        this.sprite = this.getComponent(cc.Sprite);

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    onKeyDown(e: cc.Event.EventKeyboard) {
        const k = e.keyCode;
        if (k === cc.macro.KEY.left || k === cc.macro.KEY.a) this.leftDown = true;
        if (k === cc.macro.KEY.right || k === cc.macro.KEY.d) this.rightDown = true;
        if (k === cc.macro.KEY.space || k === cc.macro.KEY.up || k === cc.macro.KEY.w) {
            if (this.isOnGround && !this.isDead) this.doJump();
        }
    }

    onKeyUp(e: cc.Event.EventKeyboard) {
        const k = e.keyCode;
        if (k === cc.macro.KEY.left || k === cc.macro.KEY.a) this.leftDown = false;
        if (k === cc.macro.KEY.right || k === cc.macro.KEY.d) this.rightDown = false;
    }

    doJump() {
        this._coyoteTimer = 0;
        this.rb.linearVelocity = cc.v2(this.rb.linearVelocity.x, this.jumpSpeed / this.PTM);
    }

    update(dt: number) {
        if (this.isDead || !this.rb) return;

        if (this._groundCountRaw === 0 && this._coyoteTimer > 0) {
            this._coyoteTimer = Math.max(0, this._coyoteTimer - dt);
        }

        let vx = 0;
        if (this.leftDown)  { vx = -(this.moveSpeed / this.PTM); this.node.scaleX = -1; }
        if (this.rightDown) { vx =  (this.moveSpeed / this.PTM); this.node.scaleX =  1; }
        this.rb.linearVelocity = cc.v2(vx, this.rb.linearVelocity.y);

        this._updateAnim(dt);

        if (this.node.y < this.fallDeathY) this.die();
    }

    private _updateAnim(dt: number) {
        const atlas = this.isBig ? this.bigAtlas : this.smallAtlas;
        if (!atlas || !this.sprite) return;

        if (!this.isOnGround) {
            // 空中：顯示跳躍 frame
            this._setFrame(atlas, this.ANIM_JUMP);
            this._walkTimer = 0;
            this._walkIdx = 0;
        } else if (this.leftDown || this.rightDown) {
            // 走路：循環 3 幀
            this._walkTimer += dt;
            if (this._walkTimer >= 1 / this.WALK_FPS) {
                this._walkTimer = 0;
                this._walkIdx = (this._walkIdx + 1) % this.ANIM_WALK.length;
            }
            this._setFrame(atlas, this.ANIM_WALK[this._walkIdx]);
        } else {
            // 靜止
            this._setFrame(atlas, this.ANIM_IDLE);
            this._walkTimer = 0;
            this._walkIdx = 0;
        }
    }

    private _setFrame(atlas: cc.SpriteAtlas, name: string) {
        const frame = atlas.getSpriteFrame(name);
        if (frame && this.sprite) this.sprite.spriteFrame = frame;
    }

    onBeginContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider) {
        const wm = contact.getWorldManifold();
        if (Math.abs(wm.normal.y) > 0.5) {
            this.activeGroundContacts.add(contact);
            this._groundCountRaw = this.activeGroundContacts.size;
        }
        if (other.node.group === 'enemy') {
            const vy = this.rb.linearVelocity.y;
            const myBottom = this.node.y - this.node.height * 0.4;
            const enemyTop = other.node.y + other.node.height * 0.3;
            if (myBottom >= enemyTop && vy <= 0) {
                (other.node.getComponent('Enemy') as any)?.stomp();
                if (GameManager.inst) GameManager.inst.addScore(100);
                this.rb.linearVelocity = cc.v2(this.rb.linearVelocity.x, 400 / this.PTM);
            } else { this.takeDamage(); }
        }
    }

    onEndContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider) {
        this.activeGroundContacts.delete(contact);
        const prev = this._groundCountRaw;
        this._groundCountRaw = this.activeGroundContacts.size;
        if (prev > 0 && this._groundCountRaw === 0) this._coyoteTimer = this.COYOTE;
    }

    takeDamage() {
        if (this.isInvincible || this.isDead) return;
        if (this.isBig) { this.isBig = false; this.node.setScale(1, 1); this._startInvincible(); }
        else { this.die(); }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.rb.linearVelocity = cc.v2(0, 0);
        this.rb.enabled = false;

        cc.tween(this.node)
            .to(0.15, { y: this.node.y + 30 })
            .to(0.5, { y: this.node.y - 500, opacity: 0 })
            .call(() => {
                if (GameManager.inst) {
                    GameManager.inst.loseLife();
                } else {
                    cc.error('找不到 GameManager！');
                }
            })
            .start();
    }

    private _startInvincible() {
        this.isInvincible = true;
        let t = 0;
        this.schedule(function () {
            this.node.opacity = this.node.opacity > 128 ? 50 : 255;
            t += 0.1;
            if (t >= this.invincibleDuration) {
                this.unscheduleAllCallbacks();
                this.node.opacity = 255;
                this.isInvincible = false;
            }
        }, 0.1);
    }
}
