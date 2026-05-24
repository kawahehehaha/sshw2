const { ccclass, property } = cc._decorator;

/**
 * TiledMapCollider
 * ─────────────────────────────────────────────────────────────────
 * Attach to the same node as TiledMap.
 * Automatically creates Static RigidBody + BoxCollider for each
 * non-empty tile in the specified layer, then merges horizontal
 * runs into single wide colliders for performance.
 *
 * Setup:
 *   1. Attach to level1 node (same node as TiledMap component)
 *   2. Set layerName to your ground layer name (e.g. "圖塊層 1")
 *   3. Set group to "ground"
 */
@ccclass
export default class TiledMapCollider extends cc.Component {

    @property({ tooltip: 'Name of the tile layer to generate colliders from' })
    layerName: string = '圖塊層 1';

    onLoad() {
        const tiledMap = this.getComponent(cc.TiledMap);
        if (!tiledMap) { cc.error('[TiledMapCollider] No TiledMap found!'); return; }

        // Wait one frame for TiledMap to fully load
        this.scheduleOnce(() => {
            this._buildColliders(tiledMap);
        }, 0);
    }

    private _buildColliders(tiledMap: cc.TiledMap) {
        const layer = tiledMap.getLayer(this.layerName);
        if (!layer) {
            cc.error(`[TiledMapCollider] Layer "${this.layerName}" not found!`);
            return;
        }

        const mapSize = tiledMap.node.getContentSize();
        const tileSize = tiledMap.getTileSize();
        const layerSize = layer.layerSize;

        const cols = layerSize.width;
        const rows = layerSize.height;
        const tw = tileSize.width;
        const th = tileSize.height;

        // TiledMap in Cocos: origin is bottom-left of the map node
        // layer.getTileGIDAt uses col (x), row (y) where row 0 = TOP
        // Cocos world Y: map bottom = node.y - mapSize.height/2
        //                map top    = node.y + mapSize.height/2

        const mapOffsetX = -mapSize.width / 2;
        const mapOffsetY = -mapSize.height / 2;

        // Build a boolean grid: solid[row][col]
        const solid: boolean[][] = [];
        for (let r = 0; r < rows; r++) {
            solid[r] = [];
            for (let c = 0; c < cols; c++) {
                const gid = layer.getTileGIDAt(cc.v2(c, r));
                solid[r][c] = gid > 0;
            }
        }

        // Merge horizontal runs per row → one collider per run
        for (let r = 0; r < rows; r++) {
            let c = 0;
            while (c < cols) {
                if (!solid[r][c]) { c++; continue; }

                // Find end of this horizontal run
                let end = c;
                while (end < cols && solid[r][end]) end++;

                const runWidth = (end - c) * tw;
                const startCol = c;

                // Position in node-local space
                // row 0 = top of map; in Cocos Y is up
                // tile center X = mapOffsetX + (startCol + runLen/2) * tw
                // tile center Y = mapOffsetY + (rows - r - 1) * th + th/2
                const localX = mapOffsetX + (startCol + (end - c) / 2) * tw;
                const localY = mapOffsetY + (rows - r - 1) * th + th / 2;

                // Create collider node as child of this node
                const colNode = new cc.Node('col_' + r + '_' + startCol);
                this.node.addChild(colNode);
                colNode.setPosition(localX, localY);
                colNode.group = 'ground';

                const rb = colNode.addComponent(cc.RigidBody);
                rb.type = cc.RigidBodyType.Static;

                const box = colNode.addComponent(cc.PhysicsBoxCollider);
                box.size = cc.size(runWidth, th);
                box.offset = cc.v2(0, 0);

                c = end;
            }
        }

        cc.log(`[TiledMapCollider] Built colliders for layer "${this.layerName}"`);
    }
}
