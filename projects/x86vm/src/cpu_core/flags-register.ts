private value: number = 0;

    getCF(): boolean {
        return (this.value & 0x0001) !== 0;
    }

    setCF(value: boolean): void {
        if (value) {
            this.value |= 0x0001;
        } else {
            this.value &= ~0x0001;
        }
    }

    getPF(): boolean {
        return (this.value & 0x0004) !== 0;
    }

    setPF(value: boolean): void {
        if (value) {
            this.value |= 0x0004;
        } else {
            this.value &= ~0x0004;
        }
    }

    getAF(): boolean {
        return (this.value & 0x0010) !== 0;
    }

    setAF(value: boolean): void {
        if (value) {
            this.value |= 0x0010;
        } else {
            this.value &= ~0x0010;
        }
    }

    getZF(): boolean {
        return (this.value & 0x0040) !== 0;
    }

    setZF(value: boolean): void {
        if (value) {
            this.value |= 0x0040;
        } else {
            this.value &= ~0x0040;
        }
    }

    getSF(): boolean {
        return (this.value & 0x0080) !== 0;
    }

    setSF(value: boolean): void {
        if (value) {
            this.value |= 0x0080;
        } else {
            this.value &= ~0x0080;
        }
    }

    getOF(): boolean {
        return (this.value & 0x0800) !== 0;
    }

    setOF(value: boolean): void {
        if (value) {
            this.value |= 0x0800;
        } else {
            this.value &= ~0x0800;
        }
    }

    getIF(): boolean {
        return (this.value & 0x0200) !== 0;
    }

    setIF(value: boolean): void {
        if (value) {
            this.value |= 0x0200;
        } else {
            this.value &= ~0x0200;
        }
    }

    getDF(): boolean {
        return (this.value & 0x0400) !== 0;
    }

    setDF(value: boolean): void {
        if (value) {
            this.value |= 0x0400;
        } else {
            this.value &= ~0x0400;
        }
    }

    reset(): void {
        this.value = 0;
    }
}
