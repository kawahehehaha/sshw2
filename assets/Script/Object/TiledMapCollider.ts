const { ccclass, property } = cc._decorator;

/**
 * TiledMapCollider (Cocos Creator 2.4 compatible)
 * Attach to level1 node (same as TiledMap component)
 */
@ccclass
export default class TiledMapCollider extends cc.Component {

    @property({ tooltip: 'Tile width in pixels' })
    tileWidth: number = 16;

    @property({ tooltip: 'Tile height in pixels' })
    tileHeight: number = 16;

    @property({ tooltip: 'Number of columns in map' })
    mapCols: number = 100;

    @property({ tooltip: 'Number of rows in map' })
    mapRows: number = 15;

    @property({ tooltip: 'Name of the tile layer' })
    layerName: string = '圖塊層 1';

    onLoad() {
        // Enable physics
        cc.director.getPhysicsManager().enabled = true;

        const tiledMap = this.getComponent(cc.TiledMap);
        if (!tiledMap) { cc.error('[TiledMapCollider] No TiledMap!'); return; }

        this.scheduleOnce(() => {
            this._build(tiledMap);
        }, 0.2);
    }

    private _build(tiledMap: cc.TiledMap) {
        const layer = tiledMap.getLayer(this.layerName);
        if (!layer) {
            cc.error(`[TiledMapCollider] Layer "${this.layerName}" not found!`);
            return;
        }

        const tw = this.tileWidth;
        const th = this.tileHeight;
        const cols = this.mapCols;
        const rows = this.mapRows;
        const mapW = cols * tw;
        const mapH = rows * th;
        const mapOffsetX = -mapW / 2;
        const mapOffsetY = -mapH / 2;

        // Build solid grid using getTiledTileAt
        const solid: boolean[][] = [];
        for (let r = 0; r < rows; r++) {
            solid[r] = [];
            for (let c = 0; c < cols; c++) {
                const tile = layer.getTiledTileAt(c, r, false);
                solid[r][c] = (tile !== null && tile !== undefined);
            }
        }

        let colCount = 0;

        // Merge horizontal runs into single colliders
        for (let r = 0; r < rows; r++) {
            let c = 0;
            while (c < cols) {
                if (!solid[r][c]) { c++; continue; }

                let end = c;
                while (end < cols && solid[r][end]) end++;

                const runW = (end - c) * tw;
                const localX = mapOffsetX + (c + (end - c) / 2) * tw;
                const localY = mapOffsetY + (rows - r - 1) * th + th / 2;

                const colNode = new cc.Node(`col_${r}_${c}`);
                this.node.addChild(colNode);
                colNode.setPosition(localX, localY);
                colNode.group = 'ground';

                const rb = colNode.addComponent(cc.RigidBody);
                rb.type = cc.RigidBodyType.Static;

                const box = colNode.addComponent(cc.PhysicsBoxCollider);
                box.size = cc.size(runW, th);

                colCount++;
                c = end;
            }
        }

        cc.log(`[TiledMapCollider] Done: ${colCount} colliders`);
    }
}