const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';

/**
 * Enemy (Goomba-like)
 * ─────────────────────────────────────────────────────────────────
 * Attach to Enemy node. Requires:
 *   - cc.RigidBody  (Dynamic, fixedAngle = true)
 *   - cc.PhysicsBoxCollider
 *   - Node Group set to "enemy"
 *
 * Behaviour:
 *   - Patrols left/right
 *   - Reverses when hitting a wall or reaching patrol distance
 *   - Can be stomped by player → plays squish anim, then destroys
 */
@ccclass
export default class Enemy extends cc.Component {

    @property({ tooltip: 'Patrol speed (px/s)' })
    moveSpeed: number = 80;

    @property({ tooltip: 'Max patrol distance from spawn (px). 0 = unlimited' })
    patrolDistance: number = 200;

    @property({ tooltip: 'Points awarded when stomped' })
    pointValue: number = 100;

    @property(cc.SpriteFrame)
    stompedFrame: cc.SpriteFrame = null; // optional flat/squished sprite

    // ─── Internal State ───────────────────────────────────
    private rb: cc.RigidBody = null;
    private sprite: cc.Sprite = null;
    private anim: cc.Animation = null;
    private direction: number = -1;         // -1 left, 1 right
    private spawnX: number = 0;
    private isDead: boolean = false;
    private groundContacts: number = 0;

    private readonly PTM: number = cc.PhysicsManager.PTM_RATIO;

    // ─── Lifecycle ────────────────────────────────────────
    onLoad() {
        this.rb = this.getComponent(cc.RigidBody);
        this.rb.enabledContactListener = true;
        this.sprite = this.getComponent(cc.Sprite);
        this.anim = this.getComponent(cc.Animation);
        this.spawnX = this.node.x;
    }

    update(dt: number) {
        if (this.isDead) return;
        if (this.groundContacts === 0) return; // wait until on ground

        // Patrol movement
        const vx = this.direction * this.moveSpeed / this.PTM;
        this.rb.linearVelocity = cc.v2(vx, this.rb.linearVelocity.y);

        // Flip sprite to face direction
        this.node.scaleX = this.direction > 0
            ? Math.abs(this.node.scaleX)
            : -Math.abs(this.node.scaleX);

        // Reverse if past patrol bounds
        if (this.patrolDistance > 0) {
            const dist = this.node.x - this.spawnX;
            if (Math.abs(dist) > this.patrolDistance) {
                this.direction *= -1;
            }
        }
    }

    // ─── Physics ──────────────────────────────────────────
    onBeginContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider) {
        if (this.isDead) return;

        const worldManifold = contact.getWorldManifold();

        // Ground contact
        if (worldManifold.normal.y > 0.5) {
            this.groundContacts++;
        }

        // Reverse on wall (horizontal contact)
        if (Math.abs(worldManifold.normal.x) > 0.7) {
            const otherNode = other.node;
            if (otherNode.group === 'ground') {
                this.direction *= -1;
            }
        }
    }

    onEndContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider) {
        const worldManifold = contact.getWorldManifold();
        if (worldManifold.normal.y > 0.5) {
            this.groundContacts = Math.max(0, this.groundContacts - 1);
        }
    }

    // ─── Stomp Kill (called by PlayerController) ──────────
    stomp() {
        if (this.isDead) return;
        this.isDead = true;

        // Stop movement
        this.rb.linearVelocity = cc.v2(0, 0);
        this.rb.enabled = false;

        // Show squished sprite if available
        if (this.stompedFrame && this.sprite) {
            this.sprite.spriteFrame = this.stompedFrame;
        }

        // Squish scale animation
        cc.tween(this.node)
            .to(0.05, { scaleY: 0.2 })
            .delay(0.3)
            .call(() => { this.node.destroy(); })
            .start();
    }
}
