const { ccclass, property } = cc._decorator;

const S_IDLE = 0;
const S_RISING = 1;
const S_OUT = 2;
const S_SINKING = 3;

@ccclass
export default class PiranhaPlant extends cc.Component {

    @property riseDistance: number = 70;  // 露出水管的距離 (px)
    @property riseTime: number = 0.8;     // 升/降所需秒數
    @property outTime: number = 2.0;      // 完全露出停留時間
    @property idleTime: number = 1.5;     // 縮回去停留時間
    @property animFps: number = 4;        // 張嘴動畫幀率
    @property({ tooltip: '勾選後改成橫向往左移動' })
    horizontal: boolean = false;

    @property({ type: [cc.SpriteFrame], tooltip: '0=閉嘴 1=張嘴' })
    frames: cc.SpriteFrame[] = [];

    private _sprite: cc.Sprite | null = null;
    private _col: cc.PhysicsBoxCollider | null = null;
    private _state: number = S_IDLE;
    private _timer: number = 0;
    private _startY: number = 0;
    private _startX: number = 0;
    private _animTimer: number = 0;
    private _frameIdx: number = 0;

    onLoad() {
        this._sprite = this.getComponent(cc.Sprite);
        this._col = this.getComponent(cc.PhysicsBoxCollider);
        if (this._col) {
            this._col.sensor = true;
        }
        const rb = this.getComponent(cc.RigidBody);
        if (rb) {
            rb.enabledContactListener = true;
            rb.gravityScale = 0;
        }
        this._startY = this.node.y;
        this._startX = this.node.x;
        this._enterIdle();
    }

    private _enterIdle() {
        this._state = S_IDLE;
        this._timer = this.idleTime;
        if (this.horizontal) { this.node.x = this._startX; }
        else                 { this.node.y = this._startY; }
        if (this._col) this._col.enabled = false;
    }

    update(dt: number) {
        // 張嘴動畫（始終播）
        if (this.frames.length >= 2 && this._sprite) {
            this._animTimer += dt;
            if (this._animTimer >= 1 / this.animFps) {
                this._animTimer = 0;
                this._frameIdx = (this._frameIdx + 1) % this.frames.length;
                this._sprite.spriteFrame = this.frames[this._frameIdx];
            }
        }

        this._timer -= dt;

        if (this._state === S_IDLE) {
            if (this._timer <= 0) {
                this._state = S_RISING;
                this._timer = this.riseTime;
                if (this._col) this._col.enabled = true;
            }

        } else if (this._state === S_RISING) {
            const p = 1 - (this._timer / this.riseTime);
            if (this.horizontal) { this.node.x = this._startX - this.riseDistance * p; }
            else                 { this.node.y = this._startY + this.riseDistance * p; }
            if (this._timer <= 0) {
                if (this.horizontal) { this.node.x = this._startX - this.riseDistance; }
                else                 { this.node.y = this._startY + this.riseDistance; }
                this._state = S_OUT;
                this._timer = this.outTime;
            }

        } else if (this._state === S_OUT) {
            if (this._timer <= 0) {
                this._state = S_SINKING;
                this._timer = this.riseTime;
            }

        } else if (this._state === S_SINKING) {
            const p = this._timer / this.riseTime;
            if (this.horizontal) { this.node.x = this._startX - this.riseDistance * p; }
            else                 { this.node.y = this._startY + this.riseDistance * p; }
            if (this._timer <= 0) {
                this._enterIdle();
            }
        }
    }

    onBeginContact(_c: cc.PhysicsContact, _s: cc.PhysicsCollider, other: cc.PhysicsCollider) {
        if (other.node.group === 'player') {
            const pc = other.node.getComponent('PlayerController') as any;
            if (pc) pc.takeDamage();
        }
    }

    onEndContact(_c: cc.PhysicsContact, _s: cc.PhysicsCollider, _o: cc.PhysicsCollider) { }
}
