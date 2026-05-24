const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';

/**
 * PlayerController
 * ─────────────────────────────────────────────────────────────────
 * Attach to Player node. Requires:
 *   - cc.RigidBody  (Dynamic, fixedAngle = true, allowSleep = false)
 *   - cc.PhysicsBoxCollider (body hitbox)
 *   - cc.Animation  (clips: idle, run, jump — optional but recommended)
 *
 * Physics setup (Project Settings > Physics):
 *   - Gravity Y = -800 (px/s² feels Mario-like with PTM=32)
 *   - Or tune to your liking
 *
 * Node Groups (Project Settings > Group Manager):
 *   - ground  (walls/platforms)
 *   - enemy
 *   - player
 */
@ccclass
export default class PlayerController extends cc.Component {

    @property({ tooltip: 'Horizontal move speed (px/s)' })
    moveSpeed: number = 220;

    @property({ tooltip: 'Initial jump velocity (px/s)' })
    jumpSpeed: number = 620;

    @property({ tooltip: 'Bounce speed after stomping enemy (px/s)' })
    stompBounce: number = 400;

    @property({ tooltip: 'Y position below which player dies (world space)' })
    fallDeathY: number = -600;

    @property({ tooltip: 'Invincibility duration after taking hit (seconds)' })
    invincibleDuration: number = 2.0;

    // ─── Internal State ───────────────────────────────────
    private rb: cc.RigidBody = null;
    private anim: cc.Animation = null;
    private bigSprite: cc.Node = null;   // optional: different sprite for big/small
    private smallSprite: cc.Node = null;

    private keys: { [key: number]: boolean } = {};
    private groundContacts: number = 0;
    private isBig: boolean = true;
    private isInvincible: boolean = false;
    private isDead: boolean = false;
    private spawnPos: cc.Vec3 = cc.v3(0, 0, 0);
    private currentAnim: string = '';

    private readonly PTM: number = cc.PhysicsManager.PTM_RATIO; // typically 32

    // ─── Lifecycle ────────────────────────────────────────
    onLoad() {
        this.rb = this.getComponent(cc.RigidBody);
        if (!this.rb) { cc.error('[PlayerController] Missing RigidBody!'); return; }
        this.rb.enabledContactListener = true;

        this.anim = this.getComponent(cc.Animation);
        this.spawnPos = this.node.position.clone();

        // Optional child nodes for big/small visual swap
        this.bigSprite = this.node.getChildByName('BigSprite');
        this.smallSprite = this.node.getChildByName('SmallSprite');
        this._syncBigSmall();

        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.on(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);

        // Make sure physics is enabled
        cc.director.getPhysicsManager().enabled = true;
    }

    onDestroy() {
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_DOWN, this.onKeyDown, this);
        cc.systemEvent.off(cc.SystemEvent.EventType.KEY_UP, this.onKeyUp, this);
    }

    // ─── Input ────────────────────────────────────────────
    private onKeyDown(event: cc.Event.EventKeyboard) {
        this.keys[event.keyCode] = true;

        const jumpKeys = [cc.KEY.space, cc.KEY.up, cc.KEY.w];
        if (jumpKeys.includes(event.keyCode) && this.isGrounded && !this.isDead) {
            this.doJump();
        }
    }

    private onKeyUp(event: cc.Event.EventKeyboard) {
        this.keys[event.keyCode] = false;
    }

    private get isGrounded(): boolean { return this.groundContacts > 0; }

    private doJump() {
        const vel = this.rb.linearVelocity;
        this.rb.linearVelocity = cc.v2(vel.x, this.jumpSpeed / this.PTM);
        this._playAnim('jump');
    }

    // ─── Update ───────────────────────────────────────────
    update(dt: number) {
        if (this.isDead) return;

        // Horizontal movement
        let vx = 0;
        if (this.keys[cc.KEY.left] || this.keys[cc.KEY.a]) {
            vx = -(this.moveSpeed / this.PTM);
            this.node.scaleX = -Math.abs(this.node.scaleX);
        } else if (this.keys[cc.KEY.right] || this.keys[cc.KEY.d]) {
            vx = this.moveSpeed / this.PTM;
            this.node.scaleX = Math.abs(this.node.scaleX);
        }

        this.rb.linearVelocity = cc.v2(vx, this.rb.linearVelocity.y);

        // Animation
        if (!this.isGrounded) {
            this._playAnim('jump');
        } else if (vx !== 0) {
            this._playAnim('run');
        } else {
            this._playAnim('idle');
        }

        // Fall death
        if (this.node.y < this.fallDeathY) {
            this.die();
        }
    }

    // ─── Physics Contacts ─────────────────────────────────
    onBeginContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider) {
        const otherNode = other.node;

        // ── Ground detection via contact normal ──
        // Normal points FROM other body TO self; if y > 0.5 we're on top
        const worldManifold = contact.getWorldManifold();
        if (worldManifold.normal.y > 0.5) {
            this.groundContacts++;
        }

        // ── Enemy contact ──
        if (otherNode.group === 'enemy') {
            const vy = this.rb.linearVelocity.y;
            const playerBottom = this.node.y - (this.node.height * this.node.scaleY * 0.4);
            const enemyTop = otherNode.y + (otherNode.height * 0.3);

            if (playerBottom >= enemyTop && vy <= 0) {
                // ✅ STOMP: player lands on enemy's head
                const enemy = otherNode.getComponent('Enemy') as any;
                enemy?.stomp();
                GameManager.inst?.addScore(100);

                // Bounce player up slightly
                const vel = this.rb.linearVelocity;
                this.rb.linearVelocity = cc.v2(vel.x, this.stompBounce / this.PTM);
            } else {
                // ❌ Side/bottom contact: take damage
                this.takeDamage();
            }
        }
    }

    onEndContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider) {
        const worldManifold = contact.getWorldManifold();
        if (worldManifold.normal.y > 0.5) {
            this.groundContacts = Math.max(0, this.groundContacts - 1);
        }
    }

    // ─── Damage / Death ───────────────────────────────────
    takeDamage() {
        if (this.isInvincible || this.isDead) return;

        if (this.isBig) {
            // Mario shrinks
            this.isBig = false;
            this._syncBigSmall();
            this._startInvincibility();
        } else {
            // Already small → die
            this.die();
        }
    }

    die() {
        if (this.isDead) return;
        this.isDead = true;
        this.rb.linearVelocity = cc.v2(0, 0);
        this.rb.enabled = false;

        // Play die animation / tween, then notify GameManager
        cc.tween(this.node)
            .to(0.15, { y: this.node.y + 40 })
            .to(0.4, { y: this.node.y - 300, opacity: 0 })
            .call(() => { GameManager.inst?.loseLife(); })
            .start();
    }

    private _startInvincibility() {
        this.isInvincible = true;
        let elapsed = 0;

        this.schedule(function () {
            this.node.opacity = this.node.opacity > 127 ? 60 : 255;
            elapsed += 0.1;
            if (elapsed >= this.invincibleDuration) {
                this.unscheduleAllCallbacks();
                this.node.opacity = 255;
                this.isInvincible = false;
            }
        }, 0.1);
    }

    private _syncBigSmall() {
        // If using separate child sprites:
        if (this.bigSprite) this.bigSprite.active = this.isBig;
        if (this.smallSprite) this.smallSprite.active = !this.isBig;

        // Otherwise just scale the node
        if (!this.bigSprite && !this.smallSprite) {
            const s = this.isBig ? 1.0 : 0.65;
            this.node.setScale(s, s);
        }
    }

    private _playAnim(name: string) {
        if (!this.anim || this.currentAnim === name) return;
        this.currentAnim = name;
        const clip = this.anim.getAnimationState(name);
        if (clip) this.anim.play(name);
    }
}
