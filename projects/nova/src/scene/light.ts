import { GraphNode } from './graph-node';
import { Entity } from './entity';
import { Component } from './component';
import { ComponentSystem } from './component-system';
import { Camera } from './camera';
import { MeshRenderer } from './mesh-renderer';
import { Scene } from './scene';
import { BatchManager } from './batch-manager';
import { ForwardRenderer } from './forward-renderer';
import { ResourceLoader, Platform } from '../core';
import { Mat3, Mat4, BoundingBox } from '../math';
import { VertexFormat, Texture, Mesh } from '../graphics';

export class Light {
    private _position: Float32Array;
    private _color: Float32Array;
    private _intensity: number;

    constructor(position: Float32Array = new Float32Array([0, 0, 0]), 
                color: Float32Array = new Float32Array([1, 1, 1]), 
                intensity: number = 1.0) {
        this._position = new Float32Array(position);
        this._color = new Float32Array(color);
        this._intensity = intensity;
    }

    get position(): Float32Array {
        return new Float32Array(this._position);
    }

    set position(pos: Float32Array) {
        this._position = new Float32Array(pos);
    }

    get color(): Float32Array {
        return new Float32Array(this._color);
    }

    set color(col: Float32Array) {
        this._color = new Float32Array(col);
    }

    get intensity(): number {
        return this._intensity;
    }

    set intensity(val: number) {
        this._intensity = val;
    }
}
