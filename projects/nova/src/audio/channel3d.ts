import { Channel } from './channel';
import { Vec3 } from '../math';

export class Channel3d extends Channel {
    private panner: PannerNode;
    private position: Vec3;
    private velocity: Vec3;
    private minDistance: number;
    private maxDistance: number;
    private rollOffFactor: number;
    private distanceModel: DistanceModelType;
    private coneInnerAngle: number;
    private coneOuterAngle: number;
    private coneOuterGain: number;

    constructor(audioManager: any, options?: any) {
        super(audioManager, options);
        this.panner = this.context.createPanner();
        this.position = Vec3.ZERO.clone();
        this.velocity = Vec3.ZERO.clone();
        this.minDistance = 1;
        this.maxDistance = 10000;
        this.rollOffFactor = 1;
        this.distanceModel = 'inverse';
        this.coneInnerAngle = 360;
        this.coneOuterAngle = 360;
        this.coneOuterGain = 0;

        this.panner.positionX.value = this.position.x;
        this.panner.positionY.value = this.position.y;
        this.panner.positionZ.value = this.position.z;
        this.panner.distanceModel = this.distanceModel;
        this.panner.refDistance = this.minDistance;
        this.panner.maxDistance = this.maxDistance;
        this.panner.rolloffFactor = this.rollOffFactor;
        this.panner.coneInnerAngle = this.coneInnerAngle;
        this.panner.coneOuterAngle = this.coneOuterAngle;
        this.panner.coneOuterGain = this.coneOuterGain;

        this.gain.disconnect();
        this.gain.connect(this.panner);
        this.panner.connect(this.context.destination);
    }

    setPosition(p: Vec3): void {
        this.position.copy(p);
        this.panner.positionX.value = p.x;
        this.panner.positionY.value = p.y;
        this.panner.positionZ.value = p.z;
    }

    getPosition(): Vec3 {
        return this.position.clone();
    }

    setVelocity(v: Vec3): void {
        this.velocity.copy(v);
        this.panner.velocityX.value = v.x;
        this.panner.velocityY.value = v.y;
        this.panner.velocityZ.value = v.z;
    }

    getVelocity(): Vec3 {
        return this.velocity.clone();
    }

    setMinDistance(d: number): void {
        this.minDistance = d;
        this.panner.refDistance = d;
    }

    getMinDistance(): number {
        return this.minDistance;
    }

    setMaxDistance(d: number): void {
        this.maxDistance = d;
        this.panner.maxDistance = d;
    }

    getMaxDistance(): number {
        return this.maxDistance;
    }

    setRollOffFactor(f: number): void {
        this.rollOffFactor = f;
        this.panner.rolloffFactor = f;
    }

    getRollOffFactor(): number {
        return this.rollOffFactor;
    }

    setDistanceModel(m: DistanceModelType): void {
        this.distanceModel = m;
        this.panner.distanceModel = m;
    }

    getDistanceModel(): DistanceModelType {
        return this.distanceModel;
    }

    setCone(inner: number, outer: number, gain: number): void {
        this.coneInnerAngle = inner;
        this.coneOuterAngle = outer;
        this.coneOuterGain = gain;
        this.panner.coneInnerAngle = inner;
        this.panner.coneOuterAngle = outer;
        this.panner.coneOuterGain = gain;
    }

    getConeInnerAngle(): number {
        return this.coneInnerAngle;
    }

    getConeOuterAngle(): number {
        return this.coneOuterAngle;
    }

    getConeOuterGain(): number {
        return this.coneOuterGain;
    }

    update(dt: number): void {
        // Doppler effect handled by Web Audio API based on velocity
        // Update panner velocity if needed
        this.panner.velocityX.value = this.velocity.x;
        this.panner.velocityY.value = this.velocity.y;
        this.panner.velocityZ.value = this.velocity.z;
    }
}

type DistanceModelType = 'linear' | 'inverse' | 'exponential';
