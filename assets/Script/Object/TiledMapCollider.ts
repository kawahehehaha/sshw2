const { ccclass, property } = cc._decorator;

@ccclass
export default class TiledMapCollider extends cc.Component {

    @property tileWidth: number = 16;
    @property tileHeight: number = 16;
    @property mapCols: number = 100;
    @property mapRows: number = 15;

    @property({ type: cc.TextAsset })
    tmxText: cc.TextAsset = null;

    onLoad() {
        cc.director.getPhysicsManager().enabled = true;
        this._build();
    }

    private _build() {
        if (!this.tmxText) {
            cc.error('[TiledMapCollider] tmxText not assigned!');
            this._buildFallback();
            return;
        }
        const xml = this.tmxText.text;
        const match = xml.match(/<data[^>]*>([\s\S]*?)<\/data>/);
        if (!match) { this._buildFallback(); return; }

        const gids = match[1].trim().split(',').map(s => parseInt(s.trim()) || 0);
        const tw = this.tileWidth, th = this.tileHeight;
        const cols = this.mapCols, rows = this.mapRows;
        const ox = -(cols * tw) / 2;
        const oy = -(rows * th) / 2;

        let count = 0;
        for (let r = 0; r < rows; r++) {
            let c = 0;
            while (c < cols) {
                if ((gids[r * cols + c] || 0) === 0) { c++; continue; }
                let end = c + 1;
                while (end < cols && (gids[r * cols + end] || 0) > 0) end++;
                const runW = (end - c) * tw;
                const n = new cc.Node(`col_${r}_${c}`);
                this.node.addChild(n);
                n.setPosition(ox + (c + (end - c) / 2) * tw, oy + (rows - r - 1) * th + th / 2);
                n.group = 'ground';
                const rb = n.addComponent(cc.RigidBody);
                rb.type = cc.RigidBodyType.Static;  // 已經改回 Static，讓剛體固定在原地
                const box = n.addComponent(cc.PhysicsBoxCollider);
                box.size = cc.size(runW, th);
                box.apply();
                count++; c = end;
            }
        }
        cc.log(`[TiledMapCollider] Created ${count} colliders`);
    }

    private _buildFallback() {
        const mapW = this.mapCols * this.tileWidth;
        const mapH = this.mapRows * this.tileHeight;
        const n = new cc.Node('ground_fallback');
        this.node.addChild(n);
        n.setPosition(0, -mapH / 2 + this.tileHeight);
        n.group = 'ground';
        const rb = n.addComponent(cc.RigidBody);
        rb.type = cc.RigidBodyType.Static;  // 已經改回 Static
        const box = n.addComponent(cc.PhysicsBoxCollider);
        box.size = cc.size(mapW, this.tileHeight * 2);
        box.apply();
    }
}