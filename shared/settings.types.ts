export interface ShortcutMap {
  refresh: string;       // default: 'mod+r'
  openSettings: string;  // default: 'mod+,'
  goBack: string;        // default: 'escape'
}

export interface AppSettings {
  // Appearance
  theme: 'dark' | 'light' | 'system';
  uiFontSize: 'small' | 'medium' | 'large';
  accentColor: 'blue' | 'purple' | 'green' | 'teal' | 'pink';

  // Graph
  graphMaxCommits: number;
  graphShowAllBranches: boolean;
  graphDensity: 'compact' | 'normal' | 'spacious';
  graphCommitDotSize: number;
  graphLaneColorPalette: 'github' | 'dracula' | 'solarized' | 'monochrome';

  // Monaco editor
  editorFontSize: number;
  editorWordWrap: boolean;
  editorLineNumbers: boolean;
  editorMinimap: boolean;
  editorDiffLayout: 'side-by-side' | 'inline';

  // Git
  statusRefreshInterval: number;
  recentReposLimit: number;
  rebaseDepth: number;

  // Application
  restoreLastRepo: boolean;
  openDevTools: boolean;
  worktreePath: string;
  autoStageAfterResolve: boolean;

  // Keyboard shortcuts
  keyboardShortcuts: ShortcutMap;
  cherryPickModifier: 'ctrlOrMeta' | 'alt';
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  uiFontSize: 'medium',
  accentColor: 'blue',

  graphMaxCommits: 500,
  graphShowAllBranches: true,
  graphDensity: 'normal',
  graphCommitDotSize: 5,
  graphLaneColorPalette: 'github',

  editorFontSize: 12,
  editorWordWrap: false,
  editorLineNumbers: true,
  editorMinimap: false,
  editorDiffLayout: 'side-by-side',

  statusRefreshInterval: 3000,
  recentReposLimit: 10,
  rebaseDepth: 20,

  restoreLastRepo: false,
  openDevTools: false,
  worktreePath: '',
  autoStageAfterResolve: false,

  keyboardShortcuts: {
    refresh: 'mod+r',
    openSettings: 'mod+,',
    goBack: 'escape',
  },
  cherryPickModifier: 'ctrlOrMeta',
};
