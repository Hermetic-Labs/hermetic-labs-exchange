/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * EXTERNAL MODULE TYPE DECLARATIONS
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * Ambient module declarations for npm packages used by marketplace packages.
 * These provide minimal type stubs so packages can be developed without
 * installing node_modules locally.
 * 
 * At runtime, the actual packages are available from the host's node_modules.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL REACT NAMESPACE
// Required for React.FC, React.CSSProperties, React.ReactNode patterns
// ─────────────────────────────────────────────────────────────────────────────

declare namespace React {
  type ReactNode = ReactElement | string | number | boolean | null | undefined | Iterable<ReactNode>;
  interface ReactElement<P = any, T = any> { type: T; props: P; key: string | null; }
  type FC<P = {}> = (props: P) => ReactElement | null;
  type CSSProperties = { [key: string]: string | number | undefined };
  type RefObject<T> = { readonly current: T | null };
  type MutableRefObject<T> = { current: T };
  const Fragment: React.FC<{ children?: ReactNode }>;
  class Component<P = {}, S = {}> {
    constructor(props: P);
    props: Readonly<P>;
    state: Readonly<S>;
    setState(state: Partial<S>): void;
    render(): ReactNode;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMON NPM PACKAGES - Catch-all for known package patterns
// Marketplace packages can use these without explicit declarations
// ─────────────────────────────────────────────────────────────────────────────

// Icon libraries
declare module 'lucide-react' {
  const content: any;
  export = content;
}

declare module '@heroicons/*' {
  const content: any;
  export = content;
}

declare module 'react-icons/*' {
  const content: any;
  export = content;
}

// UI Libraries
declare module '@radix-ui/*' {
  const content: any;
  export = content;
}

declare module '@headlessui/*' {
  const content: any;
  export = content;
}

declare module 'framer-motion' {
  const content: any;
  export = content;
}

// Charting
declare module 'recharts' {
  const content: any;
  export = content;
}

declare module 'd3' {
  const content: any;
  export = content;
}

declare module 'chart.js' {
  const content: any;
  export = content;
}

// Utilities
declare module 'lodash' {
  const content: any;
  export = content;
}

declare module 'lodash/*' {
  const content: any;
  export = content;
}

declare module 'date-fns' {
  const content: any;
  export = content;
}

declare module 'dayjs' {
  const content: any;
  export = content;
}

declare module 'uuid' {
  const content: any;
  export = content;
}

declare module 'axios' {
  const content: any;
  export = content;
}

declare module 'zod' {
  const content: any;
  export = content;
}

// State management
declare module 'zustand' {
  const content: any;
  export = content;
}

declare module 'jotai' {
  const content: any;
  export = content;
}

declare module '@tanstack/*' {
  const content: any;
  export = content;
}

// ─────────────────────────────────────────────────────────────────────────────
// REACT
// ─────────────────────────────────────────────────────────────────────────────

declare module 'react' {
  export type ReactNode = 
    | React.ReactElement
    | string
    | number
    | boolean
    | null
    | undefined
    | Iterable<ReactNode>;

  export interface ReactElement<P = any, T extends string | JSXElementConstructor<any> = string | JSXElementConstructor<any>> {
    type: T;
    props: P;
    key: string | null;
  }

  export type JSXElementConstructor<P> = ((props: P) => ReactElement<any, any> | null) | (new (props: P) => Component<P, any>);

  export type FC<P = {}> = FunctionComponent<P>;
  export interface FunctionComponent<P = {}> {
    (props: P): ReactElement<any, any> | null;
    displayName?: string;
  }

  export class Component<P = {}, S = {}> {
    constructor(props: P);
    props: Readonly<P>;
    state: Readonly<S>;
    setState(state: Partial<S> | ((prevState: S, props: P) => Partial<S>)): void;
    forceUpdate(): void;
    render(): ReactNode;
  }

  export interface RefObject<T> {
    readonly current: T | null;
  }

  export interface MutableRefObject<T> {
    current: T;
  }

  // Fragment component for grouping without extra DOM nodes
  export const Fragment: React.ExoticComponent<{ children?: ReactNode }>;
  
  // Exotic components
  export interface ExoticComponent<P = {}> {
    (props: P): ReactElement | null;
    readonly $$typeof: symbol;
  }

  // Additional commonly used React components
  export const StrictMode: React.ExoticComponent<{ children?: ReactNode }>;
  export const Suspense: React.ExoticComponent<{ fallback?: ReactNode; children?: ReactNode }>;
  export const Profiler: React.ExoticComponent<{ id: string; onRender: () => void; children?: ReactNode }>;
  
  // Portal for rendering outside parent hierarchy
  export function createPortal(children: ReactNode, container: Element): ReactElement;

  // Hooks
  export function useState<S>(initialState: S | (() => S)): [S, (value: S | ((prev: S) => S)) => void];
  export function useState<S = undefined>(): [S | undefined, (value: S | undefined | ((prev: S | undefined) => S | undefined)) => void];
  
  export function useEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: readonly unknown[]): void;
  
  export function useCallback<T extends (...args: any[]) => any>(callback: T, deps: readonly unknown[]): T;
  
  export function useMemo<T>(factory: () => T, deps: readonly unknown[]): T;
  
  export function useRef<T>(initialValue: T): MutableRefObject<T>;
  export function useRef<T>(initialValue: T | null): RefObject<T>;
  export function useRef<T = undefined>(): MutableRefObject<T | undefined>;
  
  export function useContext<T>(context: Context<T>): T;
  
  export function useReducer<R extends Reducer<any, any>>(
    reducer: R,
    initialState: ReducerState<R>
  ): [ReducerState<R>, Dispatch<ReducerAction<R>>];

  export type Reducer<S, A> = (prevState: S, action: A) => S;
  export type ReducerState<R extends Reducer<any, any>> = R extends Reducer<infer S, any> ? S : never;
  export type ReducerAction<R extends Reducer<any, any>> = R extends Reducer<any, infer A> ? A : never;
  export type Dispatch<A> = (value: A) => void;

  export interface Context<T> {
    Provider: Provider<T>;
    Consumer: Consumer<T>;
    displayName?: string;
  }
  
  export interface Provider<T> {
    (props: { value: T; children?: ReactNode }): ReactElement | null;
  }
  
  export interface Consumer<T> {
    (props: { children: (value: T) => ReactNode }): ReactElement | null;
  }

  export function createContext<T>(defaultValue: T): Context<T>;

  // Event types
  export interface SyntheticEvent<T = Element> {
    currentTarget: T;
    target: EventTarget;
    preventDefault(): void;
    stopPropagation(): void;
  }

  export interface ChangeEvent<T = Element> extends SyntheticEvent<T> {
    target: EventTarget & T;
  }

  export interface FormEvent<T = Element> extends SyntheticEvent<T> {}
  export interface MouseEvent<T = Element> extends SyntheticEvent<T> {}
  export interface KeyboardEvent<T = Element> extends SyntheticEvent<T> {
    key: string;
    code: string;
  }

  // HTML attributes
  export interface HTMLAttributes<T> {
    className?: string;
    id?: string;
    style?: CSSProperties;
    onClick?: (event: MouseEvent<T>) => void;
    onChange?: (event: ChangeEvent<T>) => void;
    onSubmit?: (event: FormEvent<T>) => void;
    onKeyDown?: (event: KeyboardEvent<T>) => void;
    onKeyUp?: (event: KeyboardEvent<T>) => void;
    children?: ReactNode;
    title?: string;
    'aria-label'?: string;
    'aria-labelledby'?: string;
    'aria-describedby'?: string;
    role?: string;
    tabIndex?: number;
    disabled?: boolean;
    placeholder?: string;
    value?: string | number | readonly string[];
    defaultValue?: string | number | readonly string[];
    name?: string;
    type?: string;
    required?: boolean;
    checked?: boolean;
    defaultChecked?: boolean;
    min?: number | string;
    max?: number | string;
    step?: number | string;
    rows?: number;
    cols?: number;
    autoFocus?: boolean;
    autoComplete?: string;
    readOnly?: boolean;
  }

  export interface CSSProperties {
    [key: string]: string | number | undefined;
  }

  // Namespace for React.FC, React.ReactNode usage
  export namespace React {
    export type ReactNode = 
      | ReactElement
      | string
      | number
      | boolean
      | null
      | undefined
      | Iterable<ReactNode>;
    export type FC<P = {}> = FunctionComponent<P>;
    export type CSSProperties = { [key: string]: string | number | undefined };
  }

  // Default export as namespace
  const React: {
    // Hooks
    useState: typeof useState;
    useEffect: typeof useEffect;
    useLayoutEffect: typeof useLayoutEffect;
    useCallback: typeof useCallback;
    useMemo: typeof useMemo;
    useRef: typeof useRef;
    useContext: typeof useContext;
    useReducer: typeof useReducer;
    createContext: typeof createContext;
    createPortal: typeof createPortal;
    // Components
    Component: typeof Component;
    Fragment: typeof Fragment;
    StrictMode: typeof StrictMode;
    Suspense: typeof Suspense;
    // Types exported as properties
    FC: any;
    ReactNode: any;
    ReactElement: any;
    CSSProperties: any;
  };
  export default React;
}

declare module 'react/jsx-runtime' {
  export namespace JSX {
    interface Element extends React.ReactElement<any, any> {}
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
  export function jsx(type: any, props: any, key?: string): JSX.Element;
  export function jsxs(type: any, props: any, key?: string): JSX.Element;
}

declare module 'react-dom' {
  export function createRoot(container: Element | DocumentFragment): {
    render(children: React.ReactNode): void;
    unmount(): void;
  };
  export function render(element: React.ReactElement, container: Element | DocumentFragment): void;
}

// ─────────────────────────────────────────────────────────────────────────────
// LUCIDE-REACT (Icon Library)
// ─────────────────────────────────────────────────────────────────────────────

declare module 'lucide-react' {
  import type { FC } from 'react';
  
  export interface LucideProps {
    size?: number | string;
    color?: string;
    strokeWidth?: number | string;
    absoluteStrokeWidth?: boolean;
    className?: string;
    style?: React.CSSProperties;
  }

  export type LucideIcon = FC<LucideProps>;

  // Common icons used in medical module
  export const User: LucideIcon;
  export const Heart: LucideIcon;
  export const Pill: LucideIcon;
  export const AlertTriangle: LucideIcon;
  export const FileText: LucideIcon;
  export const Shield: LucideIcon;
  export const Check: LucideIcon;
  export const ChevronRight: LucideIcon;
  export const ChevronLeft: LucideIcon;
  export const Save: LucideIcon;
  export const Upload: LucideIcon;
  export const Building2: LucideIcon;
  export const Palette: LucideIcon;
  export const Quote: LucideIcon;
  export const Activity: LucideIcon;
  export const AlertCircle: LucideIcon;
  export const ArrowLeft: LucideIcon;
  export const ArrowRight: LucideIcon;
  export const Bell: LucideIcon;
  export const Calendar: LucideIcon;
  export const Camera: LucideIcon;
  export const CheckCircle: LucideIcon;
  export const ChevronDown: LucideIcon;
  export const ChevronUp: LucideIcon;
  export const Circle: LucideIcon;
  export const Clock: LucideIcon;
  export const Copy: LucideIcon;
  export const Download: LucideIcon;
  export const Edit: LucideIcon;
  export const Eye: LucideIcon;
  export const EyeOff: LucideIcon;
  export const File: LucideIcon;
  export const Filter: LucideIcon;
  export const Folder: LucideIcon;
  export const Globe: LucideIcon;
  export const Grid: LucideIcon;
  export const Home: LucideIcon;
  export const Image: LucideIcon;
  export const Info: LucideIcon;
  export const Link: LucideIcon;
  export const List: LucideIcon;
  export const Loader: LucideIcon;
  export const Lock: LucideIcon;
  export const LogOut: LucideIcon;
  export const Mail: LucideIcon;
  export const Menu: LucideIcon;
  export const MessageCircle: LucideIcon;
  export const Mic: LucideIcon;
  export const MicOff: LucideIcon;
  export const Minus: LucideIcon;
  export const Monitor: LucideIcon;
  export const MoreHorizontal: LucideIcon;
  export const MoreVertical: LucideIcon;
  export const Move: LucideIcon;
  export const Pause: LucideIcon;
  export const Phone: LucideIcon;
  export const Play: LucideIcon;
  export const Plus: LucideIcon;
  export const Power: LucideIcon;
  export const Printer: LucideIcon;
  export const RefreshCw: LucideIcon;
  export const RotateCcw: LucideIcon;
  export const Search: LucideIcon;
  export const Send: LucideIcon;
  export const Settings: LucideIcon;
  export const Share: LucideIcon;
  export const Slash: LucideIcon;
  export const Speaker: LucideIcon;
  export const Square: LucideIcon;
  export const Star: LucideIcon;
  export const Stop: LucideIcon;
  export const Sun: LucideIcon;
  export const Moon: LucideIcon;
  export const Thermometer: LucideIcon;
  export const Trash: LucideIcon;
  export const Trash2: LucideIcon;
  export const TrendingUp: LucideIcon;
  export const TrendingDown: LucideIcon;
  export const Unlock: LucideIcon;
  export const UserPlus: LucideIcon;
  export const Users: LucideIcon;
  export const Video: LucideIcon;
  export const VideoOff: LucideIcon;
  export const Volume: LucideIcon;
  export const Volume2: LucideIcon;
  export const VolumeX: LucideIcon;
  export const Wifi: LucideIcon;
  export const WifiOff: LucideIcon;
  export const X: LucideIcon;
  export const XCircle: LucideIcon;
  export const Zap: LucideIcon;
  export const ZoomIn: LucideIcon;
  export const ZoomOut: LucideIcon;
  export const Stethoscope: LucideIcon;
  export const Syringe: LucideIcon;
  export const Brain: LucideIcon;
  export const Bone: LucideIcon;
  export const Droplet: LucideIcon;
  export const Ear: LucideIcon;
  export const Hand: LucideIcon;
  export const HeartPulse: LucideIcon;
  export const Lungs: LucideIcon;
  export const Scan: LucideIcon;
  export const Scale: LucideIcon;
  export const Timer: LucideIcon;
  export const Waves: LucideIcon;
}

// ─────────────────────────────────────────────────────────────────────────────
// EVENTS (Node.js EventEmitter compatibility)
// ─────────────────────────────────────────────────────────────────────────────

declare module 'events' {
  export class EventEmitter {
    on(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
    once(event: string, listener: (...args: any[]) => void): this;
    emit(event: string, ...args: any[]): boolean;
    removeListener(event: string, listener: (...args: any[]) => void): this;
    removeAllListeners(event?: string): this;
    listeners(event: string): Function[];
    listenerCount(event: string): number;
  }
  export default EventEmitter;
}
