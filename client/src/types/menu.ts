export type MenuType = 'simple' | 'columns' | 'grid';

export interface MenuColumn {
  title: string;
  items: string[];
}

export interface MenuItem {
  id: string;
  label: string;
  type: MenuType;
  basePath: string;
  items?: string[];
  columns?: MenuColumn[];
}

export interface MenuContextType {
  mainMenu: MenuItem[];
  setMainMenu: (menu: MenuItem[]) => void;
  updateMenuItem: (index: number, item: MenuItem) => void;
  addMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (index: number) => void;
}
