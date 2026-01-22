import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MenuItem } from '../types/menu';
import { toast } from 'sonner';

const INITIAL_MENU: MenuItem[] = [
  {
    id: 'products',
    label: "Produits",
    type: "simple",
    basePath: "/catalogue",
    items: [
      "Voir tout le catalogue"
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
        items: ["Papa", "Maman", "Grands-parents", "Famille", "Frères & sœurs"]
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

interface MenuContextType {
  mainMenu: MenuItem[];
  isLoading: boolean;
  setMainMenu: (menu: MenuItem[]) => void;
  updateMenuItem: (index: number, item: MenuItem) => Promise<void>;
  addMenuItem: (item: MenuItem) => Promise<void>;
  deleteMenuItem: (index: number) => Promise<void>;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export const MenuProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  // Fetch menus
  const { data: mainMenu = [], isLoading } = useQuery({
    queryKey: ['menus'],
    queryFn: async () => {
      const response = await fetch('/api/menus');
      if (!response.ok) throw new Error('Failed to fetch menus');
      const data = await response.json() as MenuItem[];
      
      // If no menus in DB, initialize with default menus
      if (data.length === 0) {
        await Promise.all(INITIAL_MENU.map(menu =>
          fetch('/api/menus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(menu),
          })
        ));
        return INITIAL_MENU;
      }
      return data;
    },
  });

  // Update menu mutation
  const updateMenuMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: MenuItem }) => {
      const response = await fetch(`/api/menus/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update menu');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast.success('Menu mis à jour');
    },
  });

  // Add menu mutation
  const addMenuMutation = useMutation({
    mutationFn: async (menu: MenuItem) => {
      const response = await fetch('/api/menus', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(menu),
      });
      if (!response.ok) throw new Error('Failed to add menu');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast.success('Menu ajouté');
    },
  });

  // Delete menu mutation
  const deleteMenuMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/menus/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete menu');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['menus'] });
      toast.success('Menu supprimé');
    },
  });

  const setMainMenu = (menu: MenuItem[]) => {
    // Update all menus
    Promise.all(menu.map((item, index) => {
      if (mainMenu[index]?.id === item.id) {
        return updateMenuMutation.mutateAsync({ id: item.id, data: item });
      }
      return Promise.resolve();
    }));
  };

  const updateMenuItem = async (index: number, item: MenuItem) => {
    await updateMenuMutation.mutateAsync({ id: item.id, data: item });
  };

  const addMenuItem = async (item: MenuItem) => {
    await addMenuMutation.mutateAsync(item);
  };

  const deleteMenuItem = async (index: number) => {
    const menu = mainMenu[index];
    if (menu) {
      await deleteMenuMutation.mutateAsync(menu.id);
    }
  };

  return (
    <MenuContext.Provider value={{ mainMenu, isLoading, setMainMenu, updateMenuItem, addMenuItem, deleteMenuItem }}>
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
