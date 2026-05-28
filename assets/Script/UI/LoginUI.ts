const { ccclass, property } = cc._decorator;
import FirebaseManager from '../Managers/FirebaseManager';

@ccclass
export default class LoginUI extends cc.Component {

    @property(cc.EditBox)
    emailInput: cc.EditBox = null;

    @property(cc.EditBox)
    passwordInput: cc.EditBox = null;

    @property(cc.EditBox)
    nameInput: cc.EditBox = null;

    @property(cc.Node)
    nameRow: cc.Node = null;

    @property(cc.Node)
    submitButton: cc.Node = null;

    @property(cc.Label)
    submitLabel: cc.Label = null;

    @property(cc.Node)
    toggleButton: cc.Node = null;

    @property(cc.Label)
    toggleLabel: cc.Label = null;

    @property(cc.Node)
    guestButton: cc.Node = null;

    @property(cc.Label)
    errorLabel: cc.Label = null;

    @property(cc.Label)
    statusLabel: cc.Label = null;

    private _isSignUp: boolean = false;

    async start() {
        this._setMode(false);

        this.submitButton?.on(cc.Node.EventType.TOUCH_END, this._onSubmit, this);
        this.toggleButton?.on(cc.Node.EventType.TOUCH_END, this._onToggle, this);
        this.guestButton?.on(cc.Node.EventType.TOUCH_END, () => {
            cc.director.loadScene('MainMenu');
        }, this);

        if (this.statusLabel) this.statusLabel.string = 'Connecting...';

        await FirebaseManager.inst?.ready;

        if (this.statusLabel) this.statusLabel.string = '';

        if (FirebaseManager.inst?.isLoggedIn) {
            cc.director.loadScene('MainMenu');
        }
    }

    private _setMode(isSignUp: boolean) {
        this._isSignUp = isSignUp;
        if (this.nameRow) this.nameRow.active = isSignUp;
        if (this.submitLabel) this.submitLabel.string = isSignUp ? 'SIGN UP' : 'SIGN IN';
        if (this.toggleLabel) this.toggleLabel.string = isSignUp ? 'ALREADY SIGNED UP?' : "HAVEN'T SIGNED UP?";
        if (this.errorLabel) this.errorLabel.string = '';
    }

    private async _onSubmit() {
        if (this.statusLabel) this.statusLabel.string = 'Connecting...';
        await FirebaseManager.inst?.ready;
        if (this.statusLabel) this.statusLabel.string = '';

        const email = this.emailInput?.string.trim() ?? '';
        const password = this.passwordInput?.string ?? '';
        const name = this.nameInput?.string.trim() ?? '';

        if (!email || !password) { this._showError('Please enter email and password'); return; }
        if (this._isSignUp && !name) { this._showError('Please enter a display name'); return; }

        if (this.submitButton) this.submitButton.active = false;
        if (this.errorLabel) this.errorLabel.string = '';

        try {
            if (this._isSignUp) {
                await FirebaseManager.inst.signUp(email, password, name);
            } else {
                await FirebaseManager.inst.signIn(email, password);
            }
            cc.director.loadScene('MainMenu');
        } catch (e: any) {
            cc.error('Login error:', e);
            this._showError(this._parseError(e.code ?? e.message ?? 'unknown'));
            if (this.submitButton) this.submitButton.active = true;
        }
    }

    private _onToggle() {
        this._setMode(!this._isSignUp);
    }

    private _showError(msg: string) {
        if (this.errorLabel) this.errorLabel.string = msg;
    }

    private _parseError(code: string): string {
        const map: Record<string, string> = {
            'auth/not-initialized':      'Firebase failed to load. Check network.',
            'auth/email-already-in-use': 'Email already in use',
            'auth/invalid-email':        'Invalid email format',
            'auth/weak-password':        'Password must be at least 6 characters',
            'auth/user-not-found':       'Account not found',
            'auth/wrong-password':       'Incorrect password',
            'auth/too-many-requests':    'Too many attempts, please try again later',
        };
        return map[code] ?? `Error: ${code}`;
    }
}
