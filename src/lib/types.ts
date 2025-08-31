export type Theme = "light" | "dark" | "system";

export type Tile = {
  id: string;
  title: string;
  url: string;
  icon?: string; // URL o emoji
  color?: string; // CSS color
  description?: string;
  tags?: string[]; // etiquetas visibles
  category?: string; // e.g., Monitoreo, QA, PROD
  env?: string; // libre (ej: DEV, QA, PROD...)
  criticality?: string; // libre (ej: low, medium, high, critical...)
  favorite?: boolean;
};

export type Group = {
  id: string;
  title: string;
  color?: string;
  tiles: Tile[];
};

export type ViewMode = "grouped" | "all";

export type DashboardState = {
  title: string;
  theme: Theme;
  columns: number; // 2..6
  tileStyle: "compact" | "cozy";
  search: string;
  editMode: boolean;
  viewMode: ViewMode;
  filters?: {
    favoritesOnly?: boolean;
    categories?: string[];
    envs?: string[];
    criticalities?: string[];
    tags?: string[];
  };
  groups: Group[];
};
