const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';

const GROW_SEQ = [false, true, false, true, false, true, false, true, true];
const SHRINK_SEQ = [true, false, true, false, true, false, true, false, false];

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

    @property(cc.AudioClip)
    jumpSfx: cc.AudioClip | null = null;

    @property(cc.AudioClip)
    dieSfx: cc.AudioClip | null = null;

    @property(cc.SpriteFrame)
    deathFrame: cc.SpriteFrame | null = null;

    @property(cc.SpriteFrame)
    bigDeathFrame: cc.SpriteFrame | null = null;

    @property(cc.AudioClip)
    powerUpSfx: cc.AudioClip | null = null;

    @property(cc.AudioClip)
    damageSfx: cc.AudioClip | null = null;

    // ── 動畫 frame 名稱，如果播錯了直接在這裡改 ──
    private readonly ANIM_IDLE = 'mario_small_17';
    private readonly ANIM_WALK = ['mario_small_6', 'mario_small_7', 'mario_small_8'];
    private readonly ANIM_JUMP = 'mario_small_4';
    private readonly BIG_ANIM_IDLE = 'mario_big_26';
    private readonly BIG_ANIM_WALK = ['mario_big_20', 'mario_big_21', 'mario_big_22'];
    private readonly BIG_ANIM_JUMP = 'mario_big_18';
    private readonly WALK_FPS = 8;

    private rb: cc.RigidBody = null;
    private sprite: cc.Sprite | null = null;
    private isDead: boolean = false;
    private isInvincible: boolean = false;
    private isBig: boolean = false;

    private _origColH: number = 0;

    // growth animation state (-1 = not growing)
    private _growIdx: number = -1;
    private _growTimer: number = 0;

    // shrink animation state (-1 = not shrinking)
    private _shrinkIdx: number = -1;
    private _shrinkTimer: number = 0;


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
        (this.rb as any).fixedAngle = true;
        this.rb.enabledContactListener = true;
        const col = this.getComponent(cc.PhysicsBoxCollider);
        if (col) {
            col.friction = 0;
            this._origColH = col.size.height;
            col.apply();
        }

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
        if (this.jumpSfx) cc.audioEngine.playEffect(this.jumpSfx, false);
    }

    update(dt: number) {
        if (this.isDead || !this.rb) return;

        if (this._groundCountRaw === 0 && this._coyoteTimer > 0) {
            this._coyoteTimer = Math.max(0, this._coyoteTimer - dt);
        }

        // ── 成長動畫 ──
        if (this._growIdx >= 0) {
            this._growTimer += dt;
            if (this._growTimer >= 0.08) {
                this._growTimer = 0;
                const useBig = GROW_SEQ[this._growIdx];
                const atlas = useBig ? this.bigAtlas : this.smallAtlas;
                const name = useBig ? this.BIG_ANIM_IDLE : this.ANIM_IDLE;
                if (atlas && this.sprite) this._setFrame(atlas, name);
                this._growIdx++;
                if (this._growIdx >= GROW_SEQ.length) {
                    this._growIdx = -1;
                    this.isBig = true;
                    this._applyBigCollider();
                }
            }
            return;
        }

        // ── 縮小動畫（受傷大→小）──
        if (this._shrinkIdx >= 0) {
            this.rb.linearVelocity = cc.v2(0, this.rb.linearVelocity.y);
            this._shrinkTimer += dt;
            if (this._shrinkTimer >= 0.08) {
                this._shrinkTimer = 0;
                const useBig = SHRINK_SEQ[this._shrinkIdx];
                const atlas = useBig ? this.bigAtlas : this.smallAtlas;
                const name = useBig ? this.BIG_ANIM_IDLE : this.ANIM_IDLE;
                if (atlas && this.sprite) this._setFrame(atlas, name);
                this._shrinkIdx++;
                if (this._shrinkIdx >= SHRINK_SEQ.length) {
                    this._shrinkIdx = -1;
                    this._applySmallCollider();
                    this._startInvincible();
                }
            }
            return;
        }

        let vx = 0;
        if (this.leftDown) { vx = -(this.moveSpeed / this.PTM); this.node.scaleX = -1; }
        if (this.rightDown) { vx = (this.moveSpeed / this.PTM); this.node.scaleX = 1; }
        this.rb.linearVelocity = cc.v2(vx, this.rb.linearVelocity.y);

        this._updateAnim(dt);

        if (this.node.y < this.fallDeathY) this.die();
    }

    powerUp() {
        if (this.isBig || this.isDead || this._growIdx >= 0) return;
        if (this.powerUpSfx) cc.audioEngine.playEffect(this.powerUpSfx, false);
        this._growIdx = 0;
        this._growTimer = 0;
    }

    private _updateAnim(dt: number) {
        const atlas = (this.isBig && this.bigAtlas) ? this.bigAtlas : this.smallAtlas;
        if (!atlas || !this.sprite) return;

        const idle = this.isBig ? this.BIG_ANIM_IDLE : this.ANIM_IDLE;
        const walk = this.isBig ? this.BIG_ANIM_WALK : this.ANIM_WALK;
        const jump = this.isBig ? this.BIG_ANIM_JUMP : this.ANIM_JUMP;

        if (!this.isOnGround) {
            this._setFrame(atlas, jump);
            this._walkTimer = 0;
            this._walkIdx = 0;
        } else if (this.leftDown || this.rightDown) {
            this._walkTimer += dt;
            if (this._walkTimer >= 1 / this.WALK_FPS) {
                this._walkTimer = 0;
                this._walkIdx = (this._walkIdx + 1) % walk.length;
            }
            this._setFrame(atlas, walk[this._walkIdx]);
        } else {
            this._setFrame(atlas, idle);
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
            const enemy = (other.node.getComponent('Enemy') ||
                other.node.getComponent('Goomba') ||
                other.node.getComponent('FlyingGoomba')) as any;
            // Already stomped this frame by an earlier contact — ignore
            if (enemy?.isDead) return;

            const vy = this.rb.linearVelocity.y;
            const selfBox = self as cc.PhysicsBoxCollider;
            const otherBox = other as cc.PhysicsBoxCollider;
            const playerBottom = self.node.convertToWorldSpaceAR(
                cc.v2(0, selfBox.offset.y - selfBox.size.height / 2)).y;
            const enemyTop = other.node.convertToWorldSpaceAR(
                cc.v2(0, otherBox.offset.y + otherBox.size.height / 2)).y;
            if (playerBottom >= enemyTop - 16 && vy <= 0) {
                other.enabled = false;
                enemy?.stomp();
                const pts = enemy?.pointValue ?? 100;
                if (GameManager.inst) GameManager.inst.addScore(pts);
                this.doJump();
            } else {
                this.takeDamage();
            }
        }
    }

    onEndContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider) {
        this.activeGroundContacts.delete(contact);
        const prev = this._groundCountRaw;
        this._groundCountRaw = this.activeGroundContacts.size;
        if (prev > 0 && this._groundCountRaw === 0) this._coyoteTimer = this.COYOTE;
    }

    private _applyBigCollider() {
        const col = this.getComponent(cc.PhysicsBoxCollider);
        if (!col) return;
        col.size = cc.size(col.size.width, this._origColH * 2);
        col.offset = cc.v2(0, 0);
        col.apply();
    }

    private _applySmallCollider() {
        const col = this.getComponent(cc.PhysicsBoxCollider);
        if (!col) return;
        col.size = cc.size(col.size.width, this._origColH);
        col.offset = cc.v2(0, 0);
        col.apply();
    }

    takeDamage() {
        if (this.isInvincible || this.isDead || this._shrinkIdx >= 0) return;
        if (this.isBig) {
            this.isBig = false;
            if (this.damageSfx) cc.audioEngine.playEffect(this.damageSfx, false);
            this._shrinkIdx = 0;
            this._shrinkTimer = 0;
        }
        else { this.die(); }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.rb.linearVelocity = cc.v2(0, 0);
        this.rb.gravityScale = 0;
        this.rb.enabled = false;
        cc.audioEngine.stopMusic();
        if (this.dieSfx) cc.audioEngine.playEffect(this.dieSfx, false);

        this.scheduleOnce(() => {
            const frame = (this.isBig && this.bigDeathFrame) ? this.bigDeathFrame : this.deathFrame;
            if (frame && this.sprite) this.sprite.spriteFrame = frame;
            this.scheduleOnce(() => {
                if (GameManager.inst) {
                    GameManager.inst.loseLife();
                } else {
                    cc.error('找不到 GameManager！');
                }
            }, 1);
        }, 1);
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
