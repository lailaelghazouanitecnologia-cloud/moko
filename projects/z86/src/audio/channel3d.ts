import { EventEmitter } from '../core';
import { Vec3 } from '../math';
import { Channel } from './channel';
import { AudioManager } from './audio-manager';

export class Channel3d extends Channel {
    private pannerNode: PannerNode;
    private gainNode: GainNode;
    private position: Vec3;
    private velocity: Vec3;
    private orientation: Vec3;
    private distanceModel: DistanceModelType;
    private panningModel: PanningModelType;
    private refDistance: number;
    private maxDistance: number;
    private rolloffFactor: number;
    private coneInnerAngle: number;
    private coneOuterAngle: number;
    private coneOuterGain: number;

    constructor(audioManager: AudioManager) {
        super(audioManager);
        this.pannerNode = audioManager.context.createPanner();
        this.gainNode = audioManager.context.createGain();
        this.position = new Vec3();
        this.velocity = new Vec3();
        this.orientation = new Vec3(0, 0, 1);
        this.distanceModel = 'inverse';
        this.panningModel = 'HRTF';
        this.refDistance = 1;
        this.maxDistance = 10000;
        this.rolloffFactor = 1;
        this.coneInnerAngle = 360;
        this.coneOuterAngle = 360;
        this.coneOuterGain = 0;

        this.pannerNode.connect(this.gainNode);
        this.gainNode.connect(audioManager.context.destination);
    }

    connect(node: AudioNode): void {
        this.gainNode.connect(node);
    }

    disconnect(node?: AudioNode): void {
        if (node) {
            this.gainNode.disconnect(node);
        } else {
            this.gainNode.disconnect();
        }
    }

    setPosition(x: number, y: number, z: number): void {
        this.position.set(x, y, z);
        this.pannerNode.setPosition(x, y, z);
    }

    getPosition(): Vec3 {
        return this.position.clone();
    }

    setVelocity(x: number, y: number, z: number): void {
        this.velocity.set(x, y, z);
        this.pannerNode.setVelocity(x, y, z);
    }

    getVelocity(): Vec3 {
        return this.velocity.clone();
    }

    setOrientation(x: number, y: number, z: number): void {
        this.orientation.set(x, y, z);
        this.pannerNode.setOrientation(x, y, z);
    }

    getOrientation(): Vec3 {
        return this.orientation.clone();
    }

    setDistanceModel(model: DistanceModelType): void {
        this.distanceModel = model;
        this.pannerNode.distanceModel = model;
    }

    getDistanceModel(): DistanceModelType {
        return this.distanceModel;
    }

    setPanningModel(model: PanningModelType): void {
        this.panningModel = model;
        this.pannerNode.panningModel = model;
    }

    getPanningModel(): PanningModelType {
        return this.panningModel;
    }

    setRefDistance(distance: number): void {
        this.refDistance = distance;
        this.pannerNode.refDistance = distance;
    }

    getRefDistance(): number {
        return this.refDistance;
    }

    setMaxDistance(distance: number): void {
        this.maxDistance = distance;
        this.pannerNode.maxDistance = distance;
    }

    getMaxDistance(): number {
        return this.maxDistance;
    }

    setRolloffFactor(factor: number): void {
        this.rolloffFactor = factor;
        this.pannerNode.rolloffFactor = factor;
    }

    getRolloffFactor(): number {
        return this.rolloffFactor;
    }

    setConeInnerAngle(angle: number): void {
        this.coneInnerAngle = angle;
        this.pannerNode.coneInnerAngle = angle;
    }

    getConeInnerAngle(): number {
        return this.coneInnerAngle;
    }

    setConeOuterAngle(angle: number): void {
        this.coneOuterAngle = angle;
        this.pannerNode.coneOuterAngle = angle;
    }

    getConeOuterAngle(): number {
        return this.coneOuterAngle;
    }

    setConeOuterGain(gain: number): void {
        this.coneOuterGain = gain;
        this.pannerNode.coneOuterGain = gain;
    }

    getConeOuterGain(): number {
        return this.coneOuterGain;
    }

    getInputNode(): AudioNode {
        return this.pannerNode;
    }

    getOutputNode(): AudioNode {
        return this.gainNode;
    }

    destroy(): void {
        this.pannerNode.disconnect();
        this.gainNode.disconnect();
        super.destroy();
    }
}
