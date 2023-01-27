export function clamp(value: number, min: number, max: number): number {
    return Math.max(Math.min(max, value), min);
}

export function isInRange(num: number, min: number, max: number): boolean {
    return num >= min && num <= max;
}

export function compact<T>(arr: Array<T | null | undefined>): T[] {
    return arr.filter((v): v is T => v !== null && v !== undefined);
}
