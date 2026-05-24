const { ccclass, property } = cc._decorator;
import GameManager from '../Managers/GameManager';

/**
 * QuestionBlock
 * ─────────────────────────────────────────────────────────────────
 * Attach to a "?" block node. Requires:
 *   - cc.RigidBody  (Static — this is what "Static wall" means in the spec!)
 *   - cc.PhysicsBoxCollider
 *   - Node Group set to "ground"
 *   - cc.Animation with clips: "idle" (wobble), "bump" (hit from below)
 *
 * "Static" RigidBody = wall/platform that does NOT move and has gravity ignored.
 * The player/enemies collide with it normally.
 *
 * When player hits from BELOW:
 *   - Plays bump animation
 *   - Spawns coin/item above
 *   - Changes sprite to used (grey box)
 *   - Can only be triggered once
 */
@ccclass
export default class QuestionBlock extends cc.Component {

    @property({ tooltip: 'Points given when block is hit' })
    coinPoints: number = 200;

    @property(cc.Prefab)
    coinPrefab: cc.Prefab = null;    // optional: coin particle to spawn

    @property(cc.SpriteFrame)
    usedFrame: cc.SpriteFrame = null; // grey/used block sprite

    @property(cc.SpriteFrame)
    activeFrame: cc.SpriteFrame = null; // "?" sprite

    // ─── Internal State ───────────────────────────────────
    private isUsed: boolean = false;
    private sprite: cc.Sprite = null;
    private anim: cc.Animation = null;
    private originalY: number = 0;

    // ─── Lifecycle ────────────────────────────────────────
    onLoad() {
        this.sprite = this.getComponent(cc.Sprite);
        this.anim = this.getComponent(cc.Animation);
        this.originalY = this.node.y;

        const rb = this.getComponent(cc.RigidBody);
        if (rb) {
            rb.enabledContactListener = true;
            // Ensure it's Static — in editor set Type = Static
            rb.type = cc.RigidBodyType.Static;
        }

        if (this.activeFrame && this.sprite) {
            this.sprite.spriteFrame = this.activeFrame;
        }
    }

    // ─── Physics Contact ──────────────────────────────────
    onBeginContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider) {
        if (this.isUsed) return;
        if (other.node.group !== 'player') return;

        // The contact normal points FROM other (player) TO self (block)
        // If player hits from below, normal.y should be negative (pushing up)
        const worldManifold = contact.getWorldManifold();

        // Player is below block → normal from block perspective points DOWN
        // i.e., normal.y < -0.5 means player hit us from below
        if (worldManifold.normal.y < -0.5) {
            this._activate();
        }
    }

    // ─── Activation ───────────────────────────────────────
    private _activate() {
        this.isUsed = true;

        // Award score
        GameManager.inst?.addScore(this.coinPoints);

        // Bump animation (bounce up and down)
        if (this.anim && this.anim.getAnimationState('bump')) {
            this.anim.play('bump');
        } else {
            // Fallback: manual tween bounce
            cc.tween(this.node)
                .to(0.08, { y: this.originalY + 20 })
                .to(0.08, { y: this.originalY })
                .start();
        }

        // Spawn coin effect above block
        if (this.coinPrefab) {
            const coin = cc.instantiate(this.coinPrefab);
            this.node.parent.addChild(coin);
            coin.setPosition(this.node.x, this.node.y + this.node.height);

            // Animate coin flying up and fading
            cc.tween(coin)
                .to(0.3, { y: coin.y + 60, opacity: 0 })
                .call(() => { coin.destroy(); })
                .start();
        }

        // Switch to "used" sprite
        this.scheduleOnce(() => {
            if (this.usedFrame && this.sprite) {
                this.sprite.spriteFrame = this.usedFrame;
            } else if (this.sprite) {
                // Simple tint to grey if no separate frame
                this.sprite.node.color = cc.color(160, 160, 160);
            }
        }, 0.16);
    }
}
