export class FrameSequencer {
    private scanline: number = 0;
    private dot: number = 0;
    private frame: number = 0;
    private isVblank: boolean = false;
    private isRendering: boolean = false;
    private oddFrame: boolean = false;

    constructor() {
        this.reset();
    }

    reset(): void {
        this.scanline = 0;
        this.dot = 0;
        this.frame = 0;
        this.isVblank = false;
        this.isRendering = false;
        this.oddFrame = false;
    }

    step(): void {
        this.dot++;
        if (this.dot > 340) {
            this.dot = 0;
            this.scanline++;
            if (this.scanline > 261) {
                this.scanline = 0;
                this.frame++;
                this.oddFrame = !this.oddFrame;
            }
        }

        if (this.scanline === 241 && this.dot === 1) {
            this.triggerVblank();
        } else if (this.scanline === 261 && this.dot === 1) {
            this.endVblank();
        }
    }

    getScanline(): number {
        return this.scanline;
    }

    getDot(): number {
        return this.dot;
    }

    isPreRender(): boolean {
        return this.scanline === 261;
    }

    isVisible(): boolean {
        return this.scanline >= 0 && this.scanline <= 239;
    }

    isVblankPeriod(): boolean {
        return this.isVblank;
    }

    isRenderCycle(): boolean {
        return this.isRendering && this.isVisible();
    }

    triggerVblank(): void {
        this.isVblank = true;
    }

    endVblank(): void {
        this.isVblank = false;
    }

    getFrameParity(): boolean {
        return this.oddFrame;
    }

    shouldSkipCycle(): boolean {
        return this.oddFrame && this.scanline === 261 && this.dot === 338;
    }

    getCurrentCycle(): number {
        return this.frame * 89342 + this.scanline * 341 + this.dot;
    }
}
