import { AnimTrack } from './anim-track';

export class AnimCurve {
    private _track: AnimTrack;
    private _duration: number;

    constructor(track: AnimTrack) {
        this._track = track;
        this._duration = this._calculateDuration();
    }

    evaluate(t: number): number {
        if (t <= 0) {
            return this._track.getKeyValue(0);
        }
        if (t >= this._duration) {
            return this._track.getKeyValue(this._track.getKeyCount() - 1);
        }

        const keyCount = this._track.getKeyCount();
        let keyIndex = 0;
        for (let i = 0; i < keyCount - 1; i++) {
            const keyTime = this._track.getKeyTime(i);
            const nextKeyTime = this._track.getKeyTime(i + 1);
            if (t >= keyTime && t <= nextKeyTime) {
                keyIndex = i;
                break;
            }
        }

        const keyTime = this._track.getKeyTime(keyIndex);
        const nextKeyTime = this._track.getKeyTime(keyIndex + 1);
        const keyValue = this._track.getKeyValue(keyIndex);
        const nextKeyValue = this._track.getKeyValue(keyIndex + 1);

        const segmentDuration = nextKeyTime - keyTime;
        const localT = segmentDuration > 0 ? (t - keyTime) / segmentDuration : 0;

        const interpolation = this._track.getInterpolation();
        switch (interpolation) {
            case 'linear':
                return keyValue + (nextKeyValue - keyValue) * localT;
            case 'step':
                return keyValue;
            case 'cubic':
                const inTangent = this._track.getKeyInTangent(keyIndex);
                const outTangent = this._track.getKeyOutTangent(keyIndex + 1);
                const t2 = localT * localT;
                const t3 = t2 * localT;
                return keyValue * (2 * t3 - 3 * t2 + 1) +
                       outTangent * (t3 - 2 * t2 + localT) +
                       nextKeyValue * (-2 * t3 + 3 * t2) +
                       inTangent * (t3 - t2);
            default:
                return keyValue;
        }
    }

    getDuration(): number {
        return this._duration;
    }

    private _calculateDuration(): number {
        const keyCount = this._track.getKeyCount();
        if (keyCount === 0) return 0;
        return this._track.getKeyTime(keyCount - 1);
    }
}
