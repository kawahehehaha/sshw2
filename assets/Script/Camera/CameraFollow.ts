const { ccclass, property } = cc._decorator;

@ccclass
export default class CameraFollow extends cc.Component {

    @property(cc.Node)
    target: cc.Node = null;

    @property mapWidth: number = 1600;
    @property smoothSpeed: number = 8;

    private hw: number = 0;

    onLoad() {
        this.hw = cc.winSize.width / 2;
        if (this.target) this._snap();
    }

    private _targetX(): number {
        let worldX = this.target.x;
        let node: cc.Node = this.target.parent;
        const root = this.node.parent;
        while (node && node !== root) {
            worldX = worldX * node.scaleX + node.x;
            node = node.parent;
        }
        return cc.misc.clampf(worldX, this.hw - this.mapWidth / 2, this.mapWidth / 2 - this.hw);
    }

    private _snap() {
        this.node.setPosition(this._targetX(), this.node.y);
    }

    lateUpdate(dt: number) {
        if (!this.target) return;
        this.node.setPosition(
            cc.misc.lerp(this.node.x, this._targetX(), dt * this.smoothSpeed),
            this.node.y
        );
    }
}