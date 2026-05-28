const { ccclass, property } = cc._decorator;
import FirebaseManager, { LeaderboardEntry } from '../Managers/FirebaseManager';

@ccclass
export default class LeaderboardUI extends cc.Component {

    @property(cc.Node)
    entryContainer: cc.Node = null;

    @property(cc.Label)
    statusLabel: cc.Label = null;

    @property(cc.Node)
    backButton: cc.Node = null;

    async start() {
        this.backButton?.on(cc.Node.EventType.TOUCH_END, () => {
            cc.director.loadScene('MainMenu');
        }, this);

        if (this.statusLabel) this.statusLabel.string = 'Loading...';

        try {
            await FirebaseManager.inst?.ready;
            const entries = await FirebaseManager.inst.getLeaderboard(10);
            if (this.statusLabel) this.statusLabel.node.active = false;
            this._populate(entries);
        } catch (e) {
            if (this.statusLabel) this.statusLabel.string = 'Failed to load leaderboard';
        }
    }

    private _populate(entries: LeaderboardEntry[]) {
        if (!this.entryContainer) return;
        const currentUid = FirebaseManager.inst?.currentUser?.uid ?? '';

        this.entryContainer.addChild(this._makeRow(
            '#', 'NAME', 'SCORE', new cc.Color(100, 100, 100)
        ));

        entries.forEach((entry, i) => {
            const isMe = entry.uid === currentUid;
            const color = isMe ? new cc.Color(255, 140, 0) : cc.Color.BLACK;
            this.entryContainer.addChild(this._makeRow(
                `${i + 1}.`,
                entry.name,
                String(entry.score).padStart(6, '0'),
                color
            ));
        });
    }

    private _makeRow(rank: string, name: string, score: string, color: cc.Color): cc.Node {
        const ROW_H = 30;
        const row = new cc.Node();
        row.width = 320;
        row.height = ROW_H;

        const positions: [string, number, number][] = [
            [rank,  40,  -120],  // x: left
            [name,  160,   -10], // x: center
            [score, 100,   110], // x: right
        ];

        for (const [text, w, x] of positions) {
            const n = new cc.Node();
            n.width = w;
            n.height = ROW_H;
            n.x = x;
            const lbl = n.addComponent(cc.Label);
            lbl.string = text;
            lbl.fontSize = 22;
            lbl.lineHeight = ROW_H;
            lbl.overflow = cc.Label.Overflow.CLAMP;
            lbl.node.color = color;
            row.addChild(n);
        }
        return row;
    }
}
