const { ccclass } = cc._decorator;

declare const firebase: any;

export interface LeaderboardEntry {
    uid: string;
    name: string;
    score: number;
}

@ccclass
export default class FirebaseManager extends cc.Component {
    private static _inst: FirebaseManager = null;
    public static get inst(): FirebaseManager { return FirebaseManager._inst; }

    private static readonly CONFIG = {
        apiKey: "AIzaSyCTh62PKxAOZ7zIvfcEES8cukdJepcOn5c",
        authDomain: "sshw2-f82d1.firebaseapp.com",
        projectId: "sshw2-f82d1",
        storageBucket: "sshw2-f82d1.firebasestorage.app",
        messagingSenderId: "356044460398",
        appId: "1:356044460398:web:913371b62c63b1052fb17f",
        measurementId: "G-B409Y12QQ9"
    };

    private _auth: any = null;
    private _db: any = null;
    private _currentUser: any = null;

    public ready: Promise<void>;
    private _readyResolve: () => void = null;

    public get currentUser() { return this._currentUser; }
    public get isLoggedIn() { return this._currentUser !== null; }
    public get displayName(): string {
        return this._currentUser?.displayName || this._currentUser?.email || 'Guest';
    }

    onLoad() {
        if (FirebaseManager._inst) { this.node.destroy(); return; }
        FirebaseManager._inst = this;
        cc.game.addPersistRootNode(this.node);
        this.ready = new Promise(res => { this._readyResolve = res; });
        this._loadSDK();
    }

    onDestroy() {
        if (FirebaseManager._inst === this) FirebaseManager._inst = null;
    }

    private _loadScript(url: string): Promise<void> {
        return new Promise((resolve, reject) => {
            const s = document.createElement('script');
            s.src = url;
            s.onload = () => resolve();
            s.onerror = (e) => reject(e);
            document.head.appendChild(s);
        });
    }

    private async _loadSDK() {
        if ((window as any).firebase) { this._initFirebase(); return; }
        try {
            const base = 'https://www.gstatic.com/firebasejs/8.10.1';
            await this._loadScript(`${base}/firebase-app.js`);
            await Promise.all([
                this._loadScript(`${base}/firebase-auth.js`),
                this._loadScript(`${base}/firebase-firestore.js`),
            ]);
            this._initFirebase();
        } catch (e) {
            cc.error('Firebase SDK 載入失敗:', e);
            this._readyResolve?.();
        }
    }

    private _initFirebase() {
        if (!firebase.apps.length) {
            firebase.initializeApp(FirebaseManager.CONFIG);
        }
        this._auth = firebase.auth();
        this._db = firebase.firestore();
        this._auth.onAuthStateChanged((user: any) => {
            this._currentUser = user;
            this._readyResolve?.();
        });
    }

    // ── Auth ──

    async signUp(email: string, password: string, displayName: string): Promise<void> {
        if (!this._auth) throw { code: 'auth/not-initialized', message: 'Firebase not ready' };
        const cred = await this._auth.createUserWithEmailAndPassword(email, password);
        await cred.user.updateProfile({ displayName });
        this._currentUser = cred.user;
        await this._db.collection('users').doc(cred.user.uid).set({
            email, displayName,
            progress: { lives: 3, score: 0, currentLevel: 1 },
        });
    }

    async signIn(email: string, password: string): Promise<void> {
        if (!this._auth) throw { code: 'auth/not-initialized', message: 'Firebase not ready' };
        const cred = await this._auth.signInWithEmailAndPassword(email, password);
        this._currentUser = cred.user;
    }

    async signOut(): Promise<void> {
        await this._auth.signOut();
        this._currentUser = null;
    }

    // ── Progress ──

    async saveProgress(lives: number, score: number, currentLevel: number): Promise<void> {
        if (!this._currentUser) return;
        await this._db.collection('users').doc(this._currentUser.uid)
            .set({ progress: { lives, score, currentLevel } }, { merge: true });
    }

    async loadProgress(): Promise<{ lives: number; score: number; currentLevel: number } | null> {
        if (!this._currentUser) return null;
        const doc = await this._db.collection('users').doc(this._currentUser.uid).get();
        return doc.exists ? (doc.data()?.progress ?? null) : null;
    }

    // ── Leaderboard ──

    async submitScore(score: number): Promise<void> {
        if (!this._currentUser) return;
        const uid = this._currentUser.uid;
        const name = this._currentUser.displayName || this._currentUser.email;
        const existing = await this._db.collection('leaderboard')
            .where('uid', '==', uid).limit(1).get();
        if (!existing.empty) {
            const doc = existing.docs[0];
            if (doc.data().score >= score) return;
            await doc.ref.update({
                score, name,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });
        } else {
            await this._db.collection('leaderboard').add({
                uid, name, score,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            });
        }
    }

    async getLeaderboard(limit: number = 10): Promise<LeaderboardEntry[]> {
        const snap = await this._db.collection('leaderboard')
            .orderBy('score', 'desc').limit(limit).get();
        return snap.docs.map((d: any) => d.data() as LeaderboardEntry);
    }
}
