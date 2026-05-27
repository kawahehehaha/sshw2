const { ccclass, property } = cc._decorator;

@ccclass
export default class SuperMushroom extends cc.Component {

    @property({ tooltip: 'Patrol speed (px/s in local space)' })
    moveSpeed: number = 80;

    private rb: cc.RigidBody = null;
    private _popping: boolean = true;
    private direction: number = 1;
    private readonly PTM: number = cc.PhysicsManager.PTM_RATIO;

    onLoad() {
        this.rb = this.getComponent(cc.RigidBody);
        if (this.rb) {
            this.rb.enabled = false;
            this.rb.enabledContactListener = true;
        }
    }

    // Called by QuestionBlock right after spawning
    popUp(targetY: number) {
        cc.tween(this.node)
            .to(0.4, { y: targetY }, { easing: 'quadOut' } as any)
            .delay(0.3)
            .call(() => {
                this._popping = false;
                if (this.rb) this.rb.enabled = true;
            })
            .start();
    }

    update(dt: number) {
        if (this._popping || !this.rb || !this.rb.enabled) return;
        this.rb.linearVelocity = cc.v2(
            this.direction * this.moveSpeed / this.PTM,
            this.rb.linearVelocity.y
        );
        this.node.scaleX = this.direction > 0
            ? Math.abs(this.node.scaleX)
            : -Math.abs(this.node.scaleX);
    }

    onBeginContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider) {
        const wm = contact.getWorldManifold();
        if (Math.abs(wm.normal.x) > 0.7 && other.node.group === 'ground') {
            this.direction *= -1;
        }
        if (other.node.group === 'player') {
            const pc = other.node.getComponent('PlayerController') as any;
            if (pc) pc.powerUp();
            this.collect();
        }
    }

    onEndContact(contact: cc.PhysicsContact, self: cc.PhysicsCollider, other: cc.PhysicsCollider) {}

    collect() {
        const root = this.node.parent ? this.node.parent : this.node;
        root.destroy();
    }
}
