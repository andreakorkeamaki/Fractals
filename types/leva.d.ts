declare module 'leva' {
  export function useControls<T>(name: string, config: Record<string, any>): T;
  export function useControls<T>(config: Record<string, any>): T;
  export function button(label: string): { onClick: () => void };
  export function folder(config: Record<string, any>, options?: { collapsed?: boolean }): Record<string, any>;
}
