export interface ElementInput {
    id: string;
    type: string;
    connected: boolean;
    isPressed(code: string): boolean;
    wasJustPressed(code: string): boolean;
    wasJustReleased(code: string): boolean;
    getValue(code: string): number;
    update(delta: number): void;
}
