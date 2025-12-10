import React, { createContext, useContext, useState, ReactNode } from 'react';
import { MenuItem } from '../types/menu';

const INITIAL_MENU: MenuItem[] = [
  {
    id: 'products',
    label: "Produits",
    type: "simple",
    basePath: "/products",
    items: [
      "Nouveau",
      "Bestsellers",
      "Livres d'enfants personnalisés",
      "Livres à chercher et à trouver",
      "Histoires à dormir debout"
    ]
  },
  {
    id: 'for',
    label: "Pour qui ?",
    type: "columns",
    basePath: "/for",
    columns: [
      {
        title: "Enfants",
        items: ["Nouveau-nés", "0–3 ans", "3–6 ans", "Enfants scolarisés"]
      },
      {
        title: "Adultes / Famille",
        items: ["Papa", "Maman", "Grands-parents", "Famille"]
      }
    ]
  },
  {
    id: 'occasions',
    label: "Occasions",
    type: "grid",
    basePath: "/occasion",
    items: [
      "Naissance", "Anniversaire", "Fête des Pères", "Fête des Mères", 
      "Noël", "Baptême", "Rentrée", "Pâques", 
      "Journée des enfants", "Communion"
    ]
  },
  {
    id: 'about',
    label: "À propos",
    type: "simple",
    basePath: "/about",
    items: [
      "L'entreprise", "Parrainage", "Carrières", "Offres", 
      "Nos Valeurs", "Programme écologie", "Blog"
    ]
  },
  {
    id: 'help',
    label: "Aide",
    type: "simple",
    basePath: "/help",
    items: [
      "FAQ", "Contact", "Service client", "Mentions légales"
    ]
  }
];

const MenuContext = createContext<MenuContextType | undefined>(undefined);

interface MenuContextType {
  mainMenu: MenuItem[];
  setMainMenu: (menu: MenuItem[]) => void;
  updateMenuItem: (index: number, item: MenuItem) => void;
  addMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (index: number) => void;
}

export const MenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mainMenu, setMainMenu] = useState<MenuItem[]>(INITIAL_MENU);

  const updateMenuItem = (index: number, item: MenuItem) => {
    const newMenu = [...mainMenu];
    newMenu[index] = item;
    setMainMenu(newMenu);
  };

  const addMenuItem = (item: MenuItem) => {
    setMainMenu([...mainMenu, item]);
  };

  const deleteMenuItem = (index: number) => {
    const newMenu = [...mainMenu];
    newMenu.splice(index, 1);
    setMainMenu(newMenu);
  };

  return (
    <MenuContext.Provider value={{ mainMenu, setMainMenu, updateMenuItem, addMenuItem, deleteMenuItem }}>
      {children}
    </MenuContext.Provider>
  );
};

export const useMenus = () => {
  const context = useContext(MenuContext);
  if (context === undefined) {
    throw new Error('useMenus must be used within a MenuProvider');
  }
  return context;
};
